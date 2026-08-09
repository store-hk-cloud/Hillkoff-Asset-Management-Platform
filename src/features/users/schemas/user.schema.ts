import { z } from "zod";

import { USER_STATUSES } from "@/domain/entities/user-profile";
import { USER_ROLES } from "@/domain/value-objects/user-role";
import { WAREHOUSE_IDS } from "@/domain/master-data/warehouses";

const nullableScope = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .transform((value) => value || null);
const nullableBranchId = z.enum(WAREHOUSE_IDS).nullable();

export const managedUserCreateSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(USER_ROLES),
  warehouseId: nullableBranchId,
  customerId: nullableScope,
});

export const userSearchSchema = z.object({
  role: z.enum([...USER_ROLES, "all"]).default("all"),
  status: z.enum([...USER_STATUSES, "all"]).default("all"),
  query: z.string().trim().max(160).default(""),
  limit: z.coerce.number().int().min(1).max(150).default(50),
});
export type UserSearchCriteria = z.infer<typeof userSearchSchema>;

export const managedUserUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(USER_ROLES),
  status: z.enum(USER_STATUSES),
  warehouseId: nullableBranchId,
  customerId: nullableScope,
  expectedVersion: z.number().int().nonnegative(),
});
