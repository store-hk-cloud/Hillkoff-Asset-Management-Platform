import { z } from "zod";

import { TECHNICIAN_WORK_TYPES } from "@/domain/entities/technician-work";

export const technicianResponseSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  action: z.enum(["accept", "reject"]),
  reason: z.string().trim().max(500).default(""),
});

export const technicianAssignSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  technicianId: z.string().trim().min(1),
});

export const technicianWorkTypeSchema = z.enum(TECHNICIAN_WORK_TYPES);
