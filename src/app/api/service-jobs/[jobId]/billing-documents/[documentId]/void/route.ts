import { voidBillingDocumentSchema } from "@/features/service-jobs/schemas/billing.schema";
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
    readonly documentId: string;
  }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const route = await validateServiceJobRouteParams(
    params,
    ["jobId", "documentId"],
    "service_job.billing.void",
  );
  if (!route.ok) return route.response;
  const routeParams = route.params;
  const auth = await authenticateServiceJobRequest(
    request,
    "service_job.billing.void",
    true,
    routeParams,
    route.correlationId,
  );
  if (!auth.ok) return auth.response;

  try {
    const { jobId, documentId } = routeParams;
    const input = await parseServiceJobJson(request, voidBillingDocumentSchema);
    const result = await serviceJobManagementService.voidBillingDocument(
      jobId,
      documentId,
      input,
      auth.context,
    );
    return serviceJobSuccessResponse(result, auth.context.correlationId);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId: auth.context.correlationId,
      operation: "service_job.billing.void",
      ...routeParams,
    });
  }
}
