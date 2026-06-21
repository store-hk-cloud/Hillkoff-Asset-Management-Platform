import { z } from "zod";

import { MOVEMENT_TYPES } from "@/domain/entities/movement-log";
import {
  getWarehouseName,
  WAREHOUSE_IDS,
} from "@/domain/master-data/warehouses";

const commonMovementSchema = z.object({
  assetCode: z.string().trim().min(1).max(60),
  destinationLocationName: z.string().trim().min(1).max(200),
  referenceNumber: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .transform((value) => value || null),
  notes: z.string().trim().max(1000),
  expectedVersion: z.number().int().nonnegative(),
});

export const transferAssetSchema = commonMovementSchema
  .extend({
    destinationWarehouseId: z.enum(WAREHOUSE_IDS),
  })
  .transform((value) => ({
    ...value,
    destinationLocationName: getWarehouseName(value.destinationWarehouseId),
  }));

export const sellAssetSchema = commonMovementSchema.extend({
  customerId: z.string().trim().min(1).max(120),
});

export const movementSearchSchema = z.object({
  type: z.enum([...MOVEMENT_TYPES, "all"]).default("all"),
});
