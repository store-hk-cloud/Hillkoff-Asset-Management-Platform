import { z } from "zod";

import {
  serviceJobTransitionSchema,
  updateServiceJobSchema,
} from "@/features/service-jobs/schemas/service-job.schema";
import {
  authenticateServiceJobRequest,
  parseServiceJobJson,
  serviceJobErrorResponse,
  serviceJobSuccessResponse,
  validateServiceJobRouteParams,
} from "@/lib/service-jobs/route-utils";
import { serviceJobManagementService } from "@/lib/service-jobs/service";

interface RouteContext {
  readonly params: Promise<{ readonly jobId: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const route = await validateServiceJobRouteParams(
    params,
    ["jobId"],
    "service_job.get",
  );
  if (!route.ok) return route.response;
  const { jobId } = route.params;
  const auth = await authenticateServiceJobRequest(
    request,
    "service_job.get",
    false,
    { jobId },
    route.correlationId,
  );
  if (!auth.ok) return auth.response;

  try {
    const record = await serviceJobManagementService.get(
      jobId,
      auth.context.actor,
    );
    return serviceJobSuccessResponse(record, auth.context.correlationId);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId: auth.context.correlationId,
      operation: "service_job.get",
      jobId,
    });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const route = await validateServiceJobRouteParams(
    params,
    ["jobId"],
    "service_job.update",
  );
  if (!route.ok) return route.response;
  const { jobId } = route.params;
  const auth = await authenticateServiceJobRequest(
    request,
    "service_job.update",
    true,
    { jobId },
    route.correlationId,
  );
  if (!auth.ok) return auth.response;

  try {
    const body = await parseServiceJobJson(request, z.unknown());
    const isTransition =
      typeof body === "object" && body !== null && "targetStatus" in body;
    let result;
    if (isTransition) {
      const input = serviceJobTransitionSchema.parse(body);
      result = await serviceJobManagementService.transition(
        jobId,
        {
          expectedVersion: input.expectedVersion,
          idempotencyKey: input.idempotencyKey,
          targetStatus: input.targetStatus,
          ...(input.scheduledStartAt
            ? { scheduledStartAt: input.scheduledStartAt }
            : {}),
        },
        auth.context,
      );
    } else {
      const input = updateServiceJobSchema.parse(body);
      result = await serviceJobManagementService.update(
        jobId,
        {
          expectedVersion: input.expectedVersion,
          idempotencyKey: input.idempotencyKey,
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.scheduledStartAt !== undefined
            ? { scheduledStartAt: input.scheduledStartAt }
            : {}),
        },
        auth.context,
      );
    }
    return serviceJobSuccessResponse(result, auth.context.correlationId);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId: auth.context.correlationId,
      operation: "service_job.update",
      jobId,
    });
  }
}
