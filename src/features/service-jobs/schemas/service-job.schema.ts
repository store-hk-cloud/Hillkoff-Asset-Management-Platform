import { z } from "zod";

import {
  SERVICE_JOB_FULFILLMENT_MODES,
  SERVICE_JOB_STATUSES,
  SERVICE_JOB_WORK_TYPES,
} from "@/domain/entities/service-job";
import { createUserId } from "@/domain/value-objects/user-id";

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const idempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const storageSegmentPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,240}$/;
const serviceJobStoragePathPattern =
  /^service-jobs\/[A-Za-z0-9][A-Za-z0-9_-]{0,119}\/evidence\/[A-Za-z0-9][A-Za-z0-9._-]{0,240}$/;

export const expectedVersionSchema = z.number().int().nonnegative();
export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(idempotencyKeyPattern);
export const apiDateSchema = z
  .string()
  .datetime()
  .transform((value) => new Date(value));
export const boundedIdSchema = z.string().trim().min(1).max(120);

export const customerSnapshotSchema = z
  .object({
    customerId: boundedIdSchema.nullable(),
    name: z.string().trim().min(1).max(160),
    taxId: z.string().trim().min(1).max(32).nullable(),
    group: z.string().trim().min(1).max(120).nullable(),
    billingAddress: z.string().trim().min(1).max(1000),
    serviceAddress: z.string().trim().min(1).max(1000),
    primaryPhone: z.string().trim().min(1).max(40),
    secondaryPhone: z.string().trim().min(1).max(40).nullable(),
  })
  .strict();

export const contactSnapshotSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().min(1).max(40),
    extension: z.string().trim().min(1).max(20).nullable(),
    email: z.string().trim().email().max(320).nullable(),
  })
  .strict();

export const assetSnapshotSchema = z
  .object({
    assetId: boundedIdSchema.nullable(),
    assetCode: z.string().trim().min(1).max(60).nullable(),
    serialNumber: z.string().trim().min(1).max(120).nullable(),
    equipmentType: z.string().trim().min(1).max(120),
    brand: z.string().trim().min(1).max(120),
    model: z.string().trim().min(1).max(120),
    warrantyStatus: z.enum(["active", "expired", "unknown"]),
    warrantyExpiresAt: apiDateSchema.nullable(),
    repeatRepair: z.boolean(),
    previousRepairNumber: z.string().trim().min(1).max(120).nullable(),
    includedAccessories: z.array(z.string().trim().min(1).max(160)).max(50),
    observedDefects: z.array(z.string().trim().min(1).max(500)).max(50),
    additionalRequirements: z.string().trim().max(2000),
  })
  .strict();

export const createServiceJobSchema = z
  .object({
    idempotencyKey: idempotencyKeySchema,
    workType: z.enum(SERVICE_JOB_WORK_TYPES),
    fulfillmentMode: z.enum(SERVICE_JOB_FULFILLMENT_MODES),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(3000),
    customer: customerSnapshotSchema,
    contact: contactSnapshotSchema,
    asset: assetSnapshotSchema,
    termsAcceptedAt: apiDateSchema,
    termsAcceptedBy: z.string().trim().min(1).max(160),
  })
  .strict();

export const updateServiceJobSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(3000).optional(),
    scheduledStartAt: apiDateSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.scheduledStartAt !== undefined,
    { message: "At least one mutable field is required." },
  );

export const serviceJobTransitionSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
    targetStatus: z.enum(SERVICE_JOB_STATUSES),
    scheduledStartAt: apiDateSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.targetStatus === "scheduled" && !value.scheduledStartAt) {
      context.addIssue({
        code: "custom",
        path: ["scheduledStartAt"],
        message: "A scheduled transition requires a start date.",
      });
    }
    if (value.targetStatus !== "scheduled" && value.scheduledStartAt) {
      context.addIssue({
        code: "custom",
        path: ["scheduledStartAt"],
        message: "A start date is only valid when scheduling a job.",
      });
    }
  });

const assignmentInputSchema = z
  .object({
    technicianId: boundedIdSchema.transform(createUserId),
    technicianName: z.string().trim().min(1).max(160),
    role: z.enum(["lead", "assistant", "inspector"]),
  })
  .strict();

export const serviceJobAssignmentSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
    assignments: z.array(assignmentInputSchema).min(1).max(20),
  })
  .strict()
  .superRefine((value, context) => {
    const leadCount = value.assignments.filter(
      (assignment) => assignment.role === "lead",
    ).length;
    if (leadCount !== 1) {
      context.addIssue({
        code: "custom",
        path: ["assignments"],
        message: "Exactly one lead technician is required.",
      });
    }

    const technicianIds = new Set<string>();
    for (const [index, assignment] of value.assignments.entries()) {
      if (technicianIds.has(assignment.technicianId)) {
        context.addIssue({
          code: "custom",
          path: ["assignments", index, "technicianId"],
          message: "A technician can only be assigned once.",
        });
      }
      technicianIds.add(assignment.technicianId);
    }
  });

export const assignmentResponseSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
    response: z.enum(["accepted", "rejected"]),
    rejectionReason: z.string().trim().min(1).max(500).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.response === "rejected" && !value.rejectionReason) {
      context.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message: "A rejection reason is required.",
      });
    }
    if (value.response === "accepted" && value.rejectionReason) {
      context.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message: "An accepted assignment cannot include a rejection reason.",
      });
    }
  });

const gpsSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracyMeters: z.number().finite().nonnegative().max(100_000),
    capturedAt: apiDateSchema,
  })
  .strict();

export const checkInSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .extend(gpsSchema.shape)
  .strict();

export const checkOutSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .extend(gpsSchema.shape)
  .strict();

export const evidenceSchema = z
  .object({
    id: boundedIdSchema.regex(storageSegmentPattern),
    category: z.enum(["before", "during", "after", "serial", "document"]),
    storagePath: z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .regex(serviceJobStoragePathPattern),
    contentType: z.enum([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]),
    sizeBytes: z.number().int().positive().max(MAX_EVIDENCE_BYTES),
    capturedAt: apiDateSchema,
  })
  .strict();

export function createEvidenceSchema(jobId: string) {
  const validatedJobId = boundedIdSchema
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/)
    .parse(jobId);
  const expectedPrefix = `service-jobs/${validatedJobId}/evidence/`;

  return evidenceSchema.superRefine((value, context) => {
    const fileSegment = value.storagePath.slice(expectedPrefix.length);
    const isBoundToJob = value.storagePath.startsWith(expectedPrefix);
    const isBoundToEvidence =
      fileSegment === value.id || fileSegment.startsWith(`${value.id}.`);

    if (!isBoundToJob || !isBoundToEvidence) {
      context.addIssue({
        code: "custom",
        path: ["storagePath"],
        message: "Evidence must be stored under its job and evidence ID.",
      });
    }
  });
}

const checklistResultSchema = z
  .object({
    id: boundedIdSchema,
    label: z.string().trim().min(1).max(300),
    result: z.enum(["pass", "fail", "not_applicable"]),
    notes: z.string().trim().max(1000),
  })
  .strict();

const partConsumedSchema = z
  .object({
    partId: boundedIdSchema,
    quantity: z.number().int().positive().max(100_000),
  })
  .strict();

const serviceActionSchema = z
  .object({
    code: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(1000),
    laborMinutes: z
      .number()
      .int()
      .nonnegative()
      .max(24 * 60),
  })
  .strict();

export const executionSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
    rootCause: z.string().trim().min(1).max(3000),
    solution: z.string().trim().min(1).max(5000),
    completionNotes: z.string().trim().max(3000),
    checklist: z.array(checklistResultSchema).max(100),
    evidence: z.array(evidenceSchema).max(50),
    partsConsumed: z.array(partConsumedSchema).max(100),
    serviceActions: z.array(serviceActionSchema).max(100),
  })
  .strict();

/**
 * API routes must create this schema with the route job ID so uploaded
 * evidence cannot be replayed against a different service job.
 */
export function createExecutionSchema(jobId: string) {
  return executionSchema.extend({
    evidence: z.array(createEvidenceSchema(jobId)).max(50),
  });
}

export const serviceJobSearchSchema = z.object({
  status: z.enum([...SERVICE_JOB_STATUSES, "all"]).default("all"),
  workType: z.enum([...SERVICE_JOB_WORK_TYPES, "all"]).default("all"),
  query: z.string().trim().max(160).default(""),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ServiceJobSearchCriteria = z.infer<typeof serviceJobSearchSchema>;

export type CreateServiceJobPayload = z.infer<typeof createServiceJobSchema>;
export type UpdateServiceJobPayload = z.infer<typeof updateServiceJobSchema>;
export type ServiceJobAssignmentPayload = z.infer<
  typeof serviceJobAssignmentSchema
>;
export type ServiceJobExecutionPayload = z.infer<typeof executionSchema>;
