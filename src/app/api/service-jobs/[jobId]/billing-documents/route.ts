import { z } from "zod";

import { issueBillingDocumentSchema } from "@/features/service-jobs/schemas/billing.schema";
import {
  authenticateServiceJobRequest,
  parseServiceJobJson,
  serviceJobErrorResponse,
  serviceJobSuccessResponse,
  validateServiceJobRouteParams,
} from "@/lib/service-jobs/route-utils";
import { serviceJobManagementService } from "@/lib/service-jobs/service";

const overrideReasonSchema = z.string().trim().min(1).max(1000).nullable();

interface RouteContext {
  readonly params: Promise<{ readonly jobId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const route = await validateServiceJobRouteParams(
    params,
    ["jobId"],
    "service_job.billing.issue",
  );
  if (!route.ok) return route.response;
  const { jobId } = route.params;
  const auth = await authenticateServiceJobRequest(
    request,
    "service_job.billing.issue",
    true,
    { jobId },
    route.correlationId,
  );
  if (!auth.ok) return auth.response;

  try {
    const input = await parseServiceJobJson(
      request,
      issueBillingDocumentSchema,
    );
    const emergencyOverrideReason = overrideReasonSchema.parse(
      request.headers.get("x-service-job-override-reason"),
    );
    const result = await serviceJobManagementService.issueBillingDocument(
      jobId,
      { ...input, emergencyOverrideReason },
      auth.context,
    );
    return serviceJobSuccessResponse(result, auth.context.correlationId, 201);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId: auth.context.correlationId,
      operation: "service_job.billing.issue",
      jobId,
    });
  }
}
