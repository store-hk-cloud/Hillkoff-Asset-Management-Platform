import { handoffServiceJobSchema } from "@/features/service-jobs/schemas/billing.schema";
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

function createHandoffSchema(jobId: string) {
  return handoffServiceJobSchema.superRefine((input, context) => {
    if (
      input.customerSignature &&
      !input.customerSignature.storagePath.startsWith(
        `service-jobs/${jobId}/signatures/`,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["customerSignature", "storagePath"],
        message: "The signature must belong to the route service job.",
      });
    }
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const route = await validateServiceJobRouteParams(
    params,
    ["jobId"],
    "service_job.handoff",
  );
  if (!route.ok) return route.response;
  const { jobId } = route.params;
  const auth = await authenticateServiceJobRequest(
    request,
    "service_job.handoff",
    true,
    { jobId },
    route.correlationId,
  );
  if (!auth.ok) return auth.response;

  try {
    const input = await parseServiceJobJson(
      request,
      createHandoffSchema(jobId),
    );
    const result = await serviceJobManagementService.handoff(
      jobId,
      {
        expectedVersion: input.expectedVersion,
        idempotencyKey: input.idempotencyKey,
        customerSignature: input.customerSignature ?? null,
        overrideReason: input.overrideReason ?? null,
        deliveryNotes: input.deliveryNotes ?? "",
      },
      auth.context,
    );
    return serviceJobSuccessResponse(result, auth.context.correlationId);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId: auth.context.correlationId,
      operation: "service_job.handoff",
      jobId,
    });
  }
}
