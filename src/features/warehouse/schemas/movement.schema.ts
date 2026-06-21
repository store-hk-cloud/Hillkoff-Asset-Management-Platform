import { z } from "zod";

import { MOVEMENT_TYPES } from "@/domain/entities/movement-log";
import { ASSET_TRANSFER_STATUSES } from "@/domain/entities/asset-transfer";
import {
  BRANCH_IDS,
  getBranchLocationName,
} from "@/domain/master-data/branches";
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

export const receiveAssetSchema = commonMovementSchema
  .extend({
    destinationBranchId: z.enum(BRANCH_IDS),
    sourceType: z.enum(["supplier", "external", "other"]),
    sourceName: z.string().trim().min(1).max(200),
  })
  .transform((value) => ({
    ...value,
    destinationLocationName: getBranchLocationName(value.destinationBranchId),
  }));

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

export const transferActionSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
});

export const receiveTransferSchema = transferActionSchema.extend({
  verificationReference: z.string().trim().min(1).max(500),
});

export const rejectTransferSchema = transferActionSchema.extend({
  reason: z.string().trim().min(1).max(500),
});

export const transferSearchSchema = z.object({
  status: z.enum([...ASSET_TRANSFER_STATUSES, "open", "all"]).default("open"),
});
