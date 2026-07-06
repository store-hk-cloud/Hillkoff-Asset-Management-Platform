import { z } from "zod";

import { MOVEMENT_TYPES } from "@/domain/entities/movement-log";
import {
  getWarehouseName,
  WAREHOUSE_IDS,
} from "@/domain/master-data/warehouses";

const baseMovementSchema = z.object({
  assetId: z.string().trim().min(1).max(120).optional(),
  assetCode: z.string().trim().min(1).max(60),
  referenceNumber: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .transform((value) => value || null),
  notes: z.string().trim().max(1000),
  expectedVersion: z.number().int().nonnegative(),
});

export const transferAssetSchema = baseMovementSchema
  .extend({
    destinationWarehouseId: z.enum(WAREHOUSE_IDS),
    destinationLocationName: z.string().trim().max(200).optional(),
  })
  .transform((value) => ({
    ...value,
    destinationLocationName: getWarehouseName(value.destinationWarehouseId),
  }));

export const sellAssetSchema = baseMovementSchema.extend({
  customerId: z.string().trim().min(1).max(120),
  destinationLocationName: z.string().trim().min(1).max(200),
});

export const transferAssetBulkSchema = z.object({
  assetCodes: z
    .array(z.string().trim().min(1).max(60))
    .min(1)
    .max(50),
  destinationWarehouseId: z.enum(WAREHOUSE_IDS),
  referenceNumber: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .transform((value) => value || null),
  notes: z.string().trim().max(1000),
});

export const movementSearchSchema = z.object({
  type: z.enum([...MOVEMENT_TYPES, "all"]).default("all"),
});
