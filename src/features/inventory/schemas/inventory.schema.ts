import { z } from "zod";

import { INVENTORY_MOVEMENT_TYPES } from "@/domain/entities/inventory";

export const inventoryPartSchema = z.object({
  partNumber: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000),
  unit: z.string().trim().min(1).max(40),
  reorderPoint: z.number().nonnegative().max(100000000),
  unitCost: z.number().nonnegative().max(100000000),
});

export const updateInventoryPartSchema = inventoryPartSchema.extend({
  expectedVersion: z.number().int().nonnegative(),
});

export const inventoryMovementSchema = z
  .object({
    partId: z.string().min(1),
    type: z.enum(INVENTORY_MOVEMENT_TYPES),
    quantity: z.number().min(-100000000).max(100000000),
    unitCost: z.number().nonnegative().max(100000000).nullable(),
    notes: z.string().trim().max(1000),
    expectedVersion: z.number().int().nonnegative(),
  })
  .superRefine((value, context) => {
    if (
      (value.type === "adjustment" && value.quantity === 0) ||
      (value.type !== "adjustment" && value.quantity <= 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Quantity is invalid for this movement type.",
      });
    }
  });
