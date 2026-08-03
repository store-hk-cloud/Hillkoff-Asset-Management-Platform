import { z } from "zod";

import {
  SERVICE_JOB_STATUSES,
  SERVICE_JOB_WORK_TYPES,
} from "@/domain/entities/service-job";
import { createUserId } from "@/domain/value-objects/user-id";
import { createServiceJobSchema } from "@/features/service-jobs/schemas/service-job.schema";
import {
  authenticateServiceJobRequest,
  parseServiceJobJson,
  serviceJobErrorResponse,
  serviceJobSuccessResponse,
} from "@/lib/service-jobs/route-utils";
import { serviceJobManagementService } from "@/lib/service-jobs/service";

const listSchema = z
  .object({
    status: z.enum(SERVICE_JOB_STATUSES).nullable(),
    workType: z.enum(SERVICE_JOB_WORK_TYPES).nullable(),
    warehouseId: z.string().trim().min(1).max(120).nullable(),
    customerId: z.string().trim().min(1).max(120).nullable(),
    assignedTechnicianId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .transform(createUserId)
      .nullable(),
    limit: z.coerce.number().int().min(1).max(100),
  })
  .strict();

export async function GET(request: Request) {
  const auth = await authenticateServiceJobRequest(
    request,
    "service_job.list",
    false,
  );
  if (!auth.ok) return auth.response;

  try {
    const search = new URL(request.url).searchParams;
    const criteria = listSchema.parse({
      status: search.get("status"),
      workType: search.get("workType"),
      warehouseId: search.get("warehouseId"),
      customerId: search.get("customerId"),
      assignedTechnicianId: search.get("assignedTechnicianId"),
      limit: search.get("limit") ?? "100",
    });
    const jobs = await serviceJobManagementService.list(
      criteria,
      auth.context.actor,
    );
    return serviceJobSuccessResponse(jobs, auth.context.correlationId);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId: auth.context.correlationId,
      operation: "service_job.list",
    });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateServiceJobRequest(
    request,
    "service_job.create",
    true,
  );
  if (!auth.ok) return auth.response;

  try {
    const input = await parseServiceJobJson(request, createServiceJobSchema);
    const warehouseId =
      auth.context.actor.role === "branch" ||
      auth.context.actor.role === "warehouse"
        ? auth.context.actor.warehouseId
        : null;
    const created = await serviceJobManagementService.create(
      { ...input, warehouseId },
      auth.context,
    );
    return serviceJobSuccessResponse(created, auth.context.correlationId, 201);
  } catch (error) {
    return serviceJobErrorResponse(error, {
      correlationId: auth.context.correlationId,
      operation: "service_job.create",
    });
  }
}
