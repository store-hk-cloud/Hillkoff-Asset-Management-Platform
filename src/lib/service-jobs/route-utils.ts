import "server-only";

import { NextResponse } from "next/server";
import { z, ZodError, type ZodType } from "zod";

import type { UserProfile } from "@/domain/entities/user-profile";
import { ServiceJobError } from "@/domain/errors/service-job.error";
import { ServiceJobPersistenceError } from "@/domain/repositories/service-job.repository";
import { ServiceJobAccessError } from "@/domain/services/service-job-access.service";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { logger } from "@/lib/logging/logger";
import type { ServiceJobRequestContext } from "@/services/service-job-management.service";

type PublicErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "BILLING_DOCUMENT_IMMUTABLE"
  | "BILLING_DOCUMENT_NOT_FOUND"
  | "IDEMPOTENCY_CONFLICT"
  | "INTERNAL_ERROR"
  | "INVENTORY_PART_NOT_FOUND"
  | "INVENTORY_VERSION_CONFLICT"
  | "SERVICE_JOB_ACCESS_DENIED"
  | "SERVICE_JOB_CHILD_CONFLICT"
  | "SERVICE_JOB_NOT_FOUND"
  | "SERVICE_JOB_OVERRIDE_REASON_REQUIRED"
  | "SERVICE_JOB_SEPARATION_OF_DUTIES"
  | "SERVICE_JOB_VERSION_CONFLICT"
  | "VALIDATION_ERROR"
  | ServiceJobPersistenceError["code"]
  | ServiceJobAccessError["code"]
  | ServiceJobError["code"];

export interface ServiceJobErrorContext {
  readonly correlationId: string;
  readonly operation: string;
  readonly jobId?: string;
  readonly assignmentId?: string;
  readonly assessmentId?: string;
  readonly documentId?: string;
  readonly authenticationFailure?: boolean;
}

export type AuthenticatedServiceJobRequest =
  | {
      readonly ok: true;
      readonly context: ServiceJobRequestContext;
    }
  | {
      readonly ok: false;
      readonly response: NextResponse;
    };

export const serviceJobRouteIdSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/);

export type ServiceJobRouteParamName =
  | "jobId"
  | "assignmentId"
  | "assessmentId"
  | "documentId";

export type ValidatedServiceJobRouteParams<K extends ServiceJobRouteParamName> =
  | {
      readonly ok: true;
      readonly correlationId: string;
      readonly params: Readonly<Record<K, string>>;
    }
  | {
      readonly ok: false;
      readonly response: NextResponse;
    };

class InvalidJsonError extends Error {
  readonly name = "InvalidJsonError";
}

const PERSISTENCE_CONFLICTS = new Set([
  "SERVICE_JOB_VERSION_CONFLICT",
  "SERVICE_JOB_CHILD_CONFLICT",
  "BILLING_DOCUMENT_IMMUTABLE",
  "INVENTORY_VERSION_CONFLICT",
  "IDEMPOTENCY_CONFLICT",
]);

const DOMAIN_CONFLICTS = new Set([
  "SERVICE_JOB_VERSION_CONFLICT",
  "INVALID_SERVICE_JOB_TRANSITION",
  "SERVICE_JOB_TRANSITION_PROTECTED",
  "SERVICE_JOB_TERMINAL",
  "ASSESSMENT_STATUS_INVALID",
  "BILLING_JOB_STATUS_INVALID",
  "BILLING_JOB_TERMINAL",
]);

const SAFE_MESSAGES: Partial<Record<PublicErrorCode, string>> = {
  AUTHENTICATION_REQUIRED: "Authentication is required.",
  SERVICE_JOB_ACCESS_DENIED: "You do not have access to this service job.",
  SERVICE_JOB_SEPARATION_OF_DUTIES:
    "This action conflicts with separation-of-duties controls.",
  SERVICE_JOB_OVERRIDE_REASON_REQUIRED:
    "An administrator override reason is required.",
  SERVICE_JOB_NOT_FOUND: "The service job was not found.",
  ASSESSMENT_NOT_FOUND: "The assessment was not found.",
  BILLING_DOCUMENT_NOT_FOUND: "The billing document was not found.",
  INVENTORY_PART_NOT_FOUND: "The inventory part was not found.",
  SERVICE_JOB_VERSION_CONFLICT:
    "The service job changed. Refresh and try again.",
  SERVICE_JOB_CHILD_CONFLICT:
    "The service job contains a conflicting child record.",
  BILLING_DOCUMENT_IMMUTABLE: "The billing document cannot be changed.",
  INVENTORY_VERSION_CONFLICT:
    "The inventory record changed. Refresh and try again.",
  IDEMPOTENCY_CONFLICT:
    "The idempotency key was already used for a different request.",
  VALIDATION_ERROR: "The request payload is invalid.",
  INTERNAL_ERROR: "The request could not be completed.",
};

function publicMessage(code: PublicErrorCode): string {
  return SAFE_MESSAGES[code] ?? "The service job request is not valid.";
}

function errorResponse(
  status: number,
  code: PublicErrorCode,
  correlationId: string,
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message: publicMessage(code) },
      correlationId,
    },
    { status },
  );
}

function safeLogContext(context: ServiceJobErrorContext) {
  return {
    correlationId: context.correlationId,
    operation: context.operation,
    ...(context.jobId ? { jobId: context.jobId } : {}),
    ...(context.assignmentId ? { assignmentId: context.assignmentId } : {}),
    ...(context.assessmentId ? { assessmentId: context.assessmentId } : {}),
    ...(context.documentId ? { documentId: context.documentId } : {}),
  };
}

function sanitizedError(error: unknown) {
  return { name: error instanceof Error ? error.name : "UnknownError" };
}

export function createServiceJobContext(
  request: Request,
  actor: UserProfile,
  correlationId = crypto.randomUUID(),
): ServiceJobRequestContext {
  return {
    actor,
    correlationId,
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function authenticateServiceJobRequest(
  request: Request,
  operation: string,
  mutation: boolean,
  routeIds: Omit<
    ServiceJobErrorContext,
    "correlationId" | "operation" | "authenticationFailure"
  > = {},
  correlationId = crypto.randomUUID(),
): Promise<AuthenticatedServiceJobRequest> {
  const errorContext = { correlationId, operation, ...routeIds };

  if (mutation && !(await isTrustedMutationRequest(request))) {
    return {
      ok: false,
      response: serviceJobErrorResponse(
        new ServiceJobAccessError(
          "SERVICE_JOB_ACCESS_DENIED",
          "The mutation request was not trusted.",
        ),
        errorContext,
      ),
    };
  }

  const session = await getCurrentSession();
  if (!session) {
    return {
      ok: false,
      response: serviceJobErrorResponse(
        new ServiceJobAccessError(
          "SERVICE_JOB_ACCESS_DENIED",
          "Authentication is required.",
        ),
        { ...errorContext, authenticationFailure: true },
      ),
    };
  }

  return {
    ok: true,
    context: createServiceJobContext(request, session.profile, correlationId),
  };
}

export async function validateServiceJobRouteParams<
  K extends ServiceJobRouteParamName,
>(
  params: Promise<Record<K, string>>,
  keys: readonly K[],
  operation: string,
): Promise<ValidatedServiceJobRouteParams<K>> {
  const correlationId = crypto.randomUUID();
  const shape = Object.fromEntries(
    keys.map((key) => [key, serviceJobRouteIdSchema]),
  ) as Record<K, typeof serviceJobRouteIdSchema>;
  const result = z
    .object(shape)
    .strict()
    .safeParse(await params);

  if (!result.success) {
    return {
      ok: false,
      response: serviceJobErrorResponse(result.error, {
        correlationId,
        operation,
      }),
    };
  }

  return {
    ok: true,
    correlationId,
    params: result.data as Readonly<Record<K, string>>,
  };
}

export function serviceJobSuccessResponse<T>(
  data: T,
  correlationId: string,
  status = 200,
) {
  return NextResponse.json({ success: true, data, correlationId }, { status });
}

export async function parseServiceJobJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw new InvalidJsonError("Request body is not valid JSON.", {
      cause: error,
    });
  }
  return schema.parse(body);
}

export function serviceJobErrorResponse(
  error: unknown,
  context: ServiceJobErrorContext,
) {
  const logContext = safeLogContext(context);

  if (context.authenticationFailure) {
    logger.warn("Service job authentication required", logContext);
    return errorResponse(401, "AUTHENTICATION_REQUIRED", context.correlationId);
  }

  if (error instanceof ZodError || error instanceof InvalidJsonError) {
    logger.warn("Service job request rejected", {
      ...logContext,
      code: "VALIDATION_ERROR",
    });
    return errorResponse(422, "VALIDATION_ERROR", context.correlationId);
  }

  if (error instanceof ServiceJobAccessError) {
    logger.warn("Service job request rejected", {
      ...logContext,
      code: error.code,
    });
    return errorResponse(403, error.code, context.correlationId);
  }

  if (error instanceof ServiceJobPersistenceError) {
    if (
      error.code === "INVALID_PERSISTED_SERVICE_JOB" ||
      error.code === "INVALID_EVENT_METADATA"
    ) {
      logger.error(
        "Unhandled service job request error",
        sanitizedError(error),
        logContext,
      );
      return errorResponse(500, "INTERNAL_ERROR", context.correlationId);
    }

    const status = error.code.endsWith("_NOT_FOUND")
      ? 404
      : PERSISTENCE_CONFLICTS.has(error.code)
        ? 409
        : 422;
    logger.warn("Service job request rejected", {
      ...logContext,
      code: error.code,
    });
    return errorResponse(status, error.code, context.correlationId);
  }

  if (error instanceof ServiceJobError) {
    const status = DOMAIN_CONFLICTS.has(error.code) ? 409 : 422;
    logger.warn("Service job request rejected", {
      ...logContext,
      code: error.code,
    });
    return errorResponse(status, error.code, context.correlationId);
  }

  logger.error(
    "Unhandled service job request error",
    sanitizedError(error),
    logContext,
  );
  return errorResponse(500, "INTERNAL_ERROR", context.correlationId);
}
