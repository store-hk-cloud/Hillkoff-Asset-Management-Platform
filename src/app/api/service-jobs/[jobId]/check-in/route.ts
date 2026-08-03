import { checkInSchema } from "@/features/service-jobs/schemas/service-job.schema";
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

export async function POST(request: Request, { params }: RouteContext) {
  const route = await validateServiceJobRouteParams(
    params,
    ["jobId"],
    "service_job.check_in",
  );
  if (!route.ok) return route.response;
  const { jobId } = route.params;
  const auth = await authenticateServiceJobRequest(
    request,
    "service_job.check_in",
    true,
    { jobId },
    route.correlationId,
  );
  if (!auth.ok) return auth.response;

  try {
    const input = await parseServiceJobJson(request, checkInSchema);
    const result = await serviceJobManagementService.checkIn(
      jobId,
      input,
      auth.context,
    );
    return serviceJobSuccessResponse(result, auth.context.correlationId);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId: auth.context.correlationId,
      operation: "service_job.check_in",
      jobId,
    });
  }
}
