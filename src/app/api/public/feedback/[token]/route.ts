import { NextResponse } from "next/server";

import {
  feedbackTokenSchema,
  publicFeedbackBodySchema,
} from "@/features/service-jobs/schemas/feedback.schema";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import {
  parseServiceJobJson,
  serviceJobErrorResponse,
  serviceJobSuccessResponse,
} from "@/lib/service-jobs/route-utils";
import { publicServiceJobFeedback } from "@/lib/service-jobs/service";

const FEEDBACK_READ_RATE_LIMIT = { max: 20, windowMs: 15 * 60 * 1000 };
const FEEDBACK_WRITE_RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

interface RouteContext {
  readonly params: Promise<{ readonly token: string }>;
}

function unavailable(correlationId: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "PUBLIC_FEEDBACK_NOT_FOUND",
        message: "This feedback request is unavailable.",
      },
      correlationId,
    },
    { status: 404 },
  );
}

function rateLimited(correlationId: string, retryAfterMs: number) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Try again later.",
      },
      correlationId,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
      },
    },
  );
}

async function enforceRateLimit(
  token: string,
  kind: "read" | "write",
  correlationId: string,
) {
  const result = await checkRateLimit(
    publicServiceJobFeedback.rateLimitKey(token, kind),
    kind === "read" ? FEEDBACK_READ_RATE_LIMIT : FEEDBACK_WRITE_RATE_LIMIT,
  );
  return result.allowed
    ? null
    : rateLimited(correlationId, result.retryAfterMs);
}

export async function GET(request: Request, { params }: RouteContext) {
  const correlationId = crypto.randomUUID();
  try {
    const token = feedbackTokenSchema.parse((await params).token);
    const limited = await enforceRateLimit(token, "read", correlationId);
    if (limited) return limited;
    const available = await publicServiceJobFeedback.isAvailable(token);
    return available
      ? serviceJobSuccessResponse({ available: true }, correlationId)
      : unavailable(correlationId);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId,
      operation: "service_job.feedback.read",
    });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const correlationId = crypto.randomUUID();
  try {
    const token = feedbackTokenSchema.parse((await params).token);
    const limited = await enforceRateLimit(token, "write", correlationId);
    if (limited) return limited;
    const input = await parseServiceJobJson(request, publicFeedbackBodySchema);
    const submitted = await publicServiceJobFeedback.submit(token, input);
    return submitted
      ? serviceJobSuccessResponse({ submitted: true }, correlationId, 201)
      : unavailable(correlationId);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId,
      operation: "service_job.feedback.submit",
    });
  }
}
