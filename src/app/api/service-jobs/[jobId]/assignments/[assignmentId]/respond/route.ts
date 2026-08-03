import { assignmentResponseSchema } from "@/features/service-jobs/schemas/service-job.schema";
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
    readonly assignmentId: string;
  }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const route = await validateServiceJobRouteParams(
    params,
    ["jobId", "assignmentId"],
    "service_job.assignment.respond",
  );
  if (!route.ok) return route.response;
  const routeParams = route.params;
  const auth = await authenticateServiceJobRequest(
    request,
    "service_job.assignment.respond",
    true,
    routeParams,
    route.correlationId,
  );
  if (!auth.ok) return auth.response;

  try {
    const { jobId, assignmentId } = routeParams;
    const input = await parseServiceJobJson(request, assignmentResponseSchema);
    const result = await serviceJobManagementService.respondToAssignment(
      jobId,
      assignmentId,
      {
        expectedVersion: input.expectedVersion,
        idempotencyKey: input.idempotencyKey,
        response: input.response,
        ...(input.rejectionReason
          ? { rejectionReason: input.rejectionReason }
          : {}),
      },
      auth.context,
    );
    return serviceJobSuccessResponse(result, auth.context.correlationId);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId: auth.context.correlationId,
      operation: "service_job.assignment.respond",
      ...routeParams,
    });
  }
}
