import { z } from "zod";

import { REPAIR_STATUSES } from "@/domain/entities/repair-ticket";
import { createUserId } from "@/domain/value-objects/user-id";

export const createRepairSchema = z.object({
  assetCode: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(3000),
});

export const assignRepairSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  technicianId: z.string().trim().min(1).transform(createUserId),
  technicianName: z.string().trim().min(1).max(160),
});

const photoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  storagePath: z.string().min(1).max(1000),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

const partSchema = z.object({
  id: z.string().min(1),
  partNumber: z.string().trim().max(120),
  name: z.string().trim().min(1).max(200),
  quantity: z.number().positive().max(100000),
  unitCost: z.number().nonnegative().max(100000000),
});

export const updateRepairSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  targetStatus: z.enum(REPAIR_STATUSES).nullable(),
  photos: z.array(photoSchema).max(30),
  rootCause: z.string().trim().max(3000),
  solution: z.string().trim().max(5000),
  laborCost: z.number().nonnegative().max(100000000),
  partsUsed: z.array(partSchema).max(100),
});
