import { z } from "zod";

import { USER_STATUSES } from "@/domain/entities/user-profile";
import { USER_ROLES } from "@/domain/value-objects/user-role";
import { BRANCH_IDS } from "@/domain/master-data/branches";

const nullableScope = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .transform((value) => value || null);
const nullableBranchId = z.enum(BRANCH_IDS).nullable();

export const managedUserCreateSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(USER_ROLES),
  branchId: nullableBranchId,
  customerId: nullableScope,
});

export const managedUserUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(USER_ROLES),
  status: z.enum(USER_STATUSES),
  branchId: nullableBranchId,
  customerId: nullableScope,
  expectedVersion: z.number().int().nonnegative(),
});
