import { z } from "zod";

import { createUserId } from "@/domain/value-objects/user-id";

export const schedulePmSchema = z.object({
  assetCode: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(200),
  scheduledAt: z
    .string()
    .datetime()
    .transform((value) => new Date(value)),
  assignedTechnicianId: z.string().trim().min(1).transform(createUserId),
  assignedTechnicianName: z.string().trim().min(1).max(160),
  checklistLabels: z.array(z.string().trim().min(1).max(300)).min(1).max(50),
  recurrenceMonths: z.number().int().min(1).max(120).nullable(),
});

const checklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean(),
  completed: z.boolean(),
  notes: z.string().max(500),
});

export const completePmSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  checklist: z.array(checklistItemSchema).min(1),
  completionNotes: z.string().trim().max(3000),
});
