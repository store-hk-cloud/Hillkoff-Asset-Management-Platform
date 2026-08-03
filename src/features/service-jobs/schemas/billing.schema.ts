import { z } from "zod";

import {
  apiDateSchema,
  boundedIdSchema,
  expectedVersionSchema,
  idempotencyKeySchema,
} from "@/features/service-jobs/schemas/service-job.schema";

export const issueBillingDocumentSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
    assessmentId: boundedIdSchema,
    kind: z.enum([
      "delivery_note",
      "invoice",
      "tax_invoice",
      "service_invoice",
      "parts_invoice",
    ]),
    issueDate: apiDateSchema,
    dueDate: apiDateSchema,
    paymentTerms: z.string().trim().min(1).max(500),
    department: z.string().trim().min(1).max(160),
    salesperson: z.string().trim().min(1).max(160),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.dueDate < value.issueDate) {
      context.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "The due date cannot be before the issue date.",
      });
    }
  });

export const voidBillingDocumentSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

const customerSignatureSchema = z
  .object({
    signerName: z.string().trim().min(1).max(160),
    storagePath: z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .regex(
        /^service-jobs\/[A-Za-z0-9][A-Za-z0-9_-]{0,119}\/signatures\/[A-Za-z0-9_-]{1,200}\.png$/,
      ),
    signedAt: apiDateSchema,
  })
  .strict();

export const handoffServiceJobSchema = z
  .object({
    expectedVersion: expectedVersionSchema,
    idempotencyKey: idempotencyKeySchema,
    customerSignature: customerSignatureSchema.optional(),
    overrideReason: z.string().trim().min(1).max(1000).optional(),
    deliveryNotes: z.string().trim().max(2000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const hasSignature = value.customerSignature !== undefined;
    const hasOverrideReason = value.overrideReason !== undefined;
    if (hasSignature === hasOverrideReason) {
      context.addIssue({
        code: "custom",
        message: "A customer signature or override reason is required.",
      });
    }
  });

export type IssueBillingDocumentPayload = z.infer<
  typeof issueBillingDocumentSchema
>;
export type VoidBillingDocumentPayload = z.infer<
  typeof voidBillingDocumentSchema
>;
export type HandoffServiceJobPayload = z.infer<typeof handoffServiceJobSchema>;
