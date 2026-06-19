import { z } from "zod";

import { ASSET_CONDITIONS, ASSET_STATUSES } from "@/domain/entities/asset";

const nullableTrimmedString = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .transform((value) => value || null);

const installedAtSchema = z
  .string()
  .trim()
  .nullable()
  .transform((value, context) => {
    if (!value) {
      return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      context.addIssue({
        code: "custom",
        message: "Invalid installation date.",
      });
      return z.NEVER;
    }

    return date;
  });

export const assetCreateSchema = z.object({
  assetCode: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000),
  category: z.string().trim().min(1).max(120),
  serialNumber: nullableTrimmedString,
  condition: z.enum(ASSET_CONDITIONS),
  branchId: nullableTrimmedString,
  customerId: nullableTrimmedString,
  locationName: z.string().trim().max(200),
  installedAt: installedAtSchema,
});

export const assetUpdateSchema = assetCreateSchema
  .omit({
    branchId: true,
    customerId: true,
    locationName: true,
  })
  .extend({
    expectedVersion: z.number().int().nonnegative(),
  });

export const assetSearchSchema = z.object({
  query: z.string().trim().max(120).default(""),
  status: z.enum([...ASSET_STATUSES, "all"]).default("active"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type AssetCreateValues = z.input<typeof assetCreateSchema>;
export type AssetUpdateValues = z.input<typeof assetUpdateSchema>;
