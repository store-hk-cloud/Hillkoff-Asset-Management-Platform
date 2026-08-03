import { z } from "zod";

import {
  apiDateSchema,
  boundedIdSchema,
  expectedVersionSchema,
  idempotencyKeySchema,
} from "@/features/service-jobs/schemas/service-job.schema";
import { SERVICE_JOB_CHARGE_POLICY_KINDS } from "@/domain/entities/service-job";
import { createUserId } from "@/domain/value-objects/user-id";
import { calculateAssessmentTotals } from "@/domain/services/service-job-money.service";

const basisPointsSchema = z.number().int().min(0).max(10_000);

const assessmentLineSchema = z
  .object({
    id: boundedIdSchema,
    code: z.string().trim().min(1).max(120),
    type: z.enum(["service", "part"]),
    description: z.string().trim().min(1).max(1000),
    unit: z.string().trim().min(1).max(40),
    quantity: z.number().int().positive().max(100_000),
    unitPriceSatang: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER),
    discountBasisPoints: basisPointsSchema,
    discountReason: z.string().trim().min(1).max(1000).nullable(),
    warehouseId: boundedIdSchema.nullable(),
    warrantyMonths: z.number().int().nonnegative().max(1_200),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.discountBasisPoints === 10_000 && !value.discountReason) {
      context.addIssue({
        code: "custom",
        path: ["discountReason"],
        message: "A 100% discount requires a reason.",
      });
    }
  });

const chargePolicySchema = z
  .object({
    kind: z.enum(SERVICE_JOB_CHARGE_POLICY_KINDS),
    vatBasisPoints: basisPointsSchema,
    withholdingBasisPoints: basisPointsSchema,
    depositBasisPoints: basisPointsSchema,
  })
  .strict();

export const createAssessmentSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
    evaluatorId: boundedIdSchema.transform(createUserId),
    lines: z.array(assessmentLineSchema).min(1).max(100),
    policy: chargePolicySchema,
  })
  .strict()
  .superRefine((value, context) => {
    try {
      calculateAssessmentTotals(value.lines, value.policy);
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["lines"],
        message:
          error instanceof Error
            ? error.message
            : "Assessment totals are invalid.",
      });
    }
  });

export const assessmentResponseSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
    response: z.enum(["approved", "rejected"]),
    responderName: z.string().trim().min(1).max(160),
    responseReason: z.string().trim().min(1).max(1000).optional(),
    respondedAt: apiDateSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.response === "rejected" && !value.responseReason) {
      context.addIssue({
        code: "custom",
        path: ["responseReason"],
        message: "A rejection reason is required.",
      });
    }
    if (value.response === "approved" && value.responseReason) {
      context.addIssue({
        code: "custom",
        path: ["responseReason"],
        message: "An approved assessment cannot include a rejection reason.",
      });
    }
  });

export type CreateAssessmentPayload = z.infer<typeof createAssessmentSchema>;
export type AssessmentResponsePayload = z.infer<
  typeof assessmentResponseSchema
>;
