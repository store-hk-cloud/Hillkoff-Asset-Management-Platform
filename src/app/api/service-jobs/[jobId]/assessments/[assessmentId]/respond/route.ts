import { assessmentResponseSchema } from "@/features/service-jobs/schemas/assessment.schema";
import {
  authenticateServiceJobRequest,
  parseServiceJobJson,
  serviceJobErrorResponse,
  serviceJobSuccessResponse,
  validateServiceJobRouteParams,
} from "@/lib/service-jobs/route-utils";
import { serviceJobManagementService } from "@/lib/service-jobs/service";

interface RouteContext {
  readonly params: Promise<{
    readonly jobId: string;
    readonly assessmentId: string;
  }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const route = await validateServiceJobRouteParams(
    params,
    ["jobId", "assessmentId"],
    "service_job.assessment.respond",
  );
  if (!route.ok) return route.response;
  const routeParams = route.params;
  const auth = await authenticateServiceJobRequest(
    request,
    "service_job.assessment.respond",
    true,
    routeParams,
    route.correlationId,
  );
  if (!auth.ok) return auth.response;

  try {
    const { jobId, assessmentId } = routeParams;
    const input = await parseServiceJobJson(request, assessmentResponseSchema);
    const result =
      input.response === "approved"
        ? await serviceJobManagementService.approveAssessment(
            jobId,
            assessmentId,
            {
              expectedVersion: input.expectedVersion,
              idempotencyKey: input.idempotencyKey,
              responderName: input.responderName,
              respondedAt: input.respondedAt,
              emergencyOverrideReason: null,
            },
            auth.context,
          )
        : await serviceJobManagementService.rejectAssessment(
            jobId,
            assessmentId,
            {
              expectedVersion: input.expectedVersion,
              idempotencyKey: input.idempotencyKey,
              responderName: input.responderName,
              responseReason: input.responseReason!,
              respondedAt: input.respondedAt,
            },
            auth.context,
          );
    return serviceJobSuccessResponse(result, auth.context.correlationId);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId: auth.context.correlationId,
      operation: "service_job.assessment.respond",
      ...routeParams,
    });
  }
}
