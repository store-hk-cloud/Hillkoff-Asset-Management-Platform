import { z } from "zod";

import { createUserId } from "@/domain/value-objects/user-id";

export const scheduleInstallationSchema = z.object({
  assetCode: z.string().trim().min(1).max(60),
  customerId: z.string().trim().min(1).max(120),
  customerName: z.string().trim().min(1).max(160),
  address: z.string().trim().min(1).max(1000),
  scheduledAt: z
    .string()
    .datetime()
    .transform((value) => new Date(value)),
  assignedTechnicianId: z.string().trim().min(1).transform(createUserId),
  assignedTechnicianName: z.string().trim().min(1).max(160),
  warrantyMonths: z.coerce.number().int().min(1).max(120).default(12),
});

const checklistSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean(),
  completed: z.boolean(),
  notes: z.string().max(500),
});

const uploadedFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  storagePath: z.string().min(1).max(1000),
  contentType: z.string().min(1).max(120),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

export const completeInstallationSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  checklist: z.array(checklistSchema).min(1),
  gpsLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().nullable(),
    capturedAt: z
      .string()
      .datetime()
      .transform((value) => new Date(value)),
  }),
  photos: z.array(uploadedFileSchema).min(1).max(20),
  training: z.object({
    completed: z.literal(true),
    traineeName: z.string().trim().min(1).max(160),
    topics: z.array(z.string().trim().min(1).max(160)).min(1).max(20),
    notes: z.string().trim().max(1000),
  }),
  signature: z.object({
    signerName: z.string().trim().min(1).max(160),
    storagePath: z.string().min(1).max(1000),
  }),
});
