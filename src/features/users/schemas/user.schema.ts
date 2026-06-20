import { z } from "zod";

import { USER_STATUSES } from "@/domain/entities/user-profile";
import { USER_ROLES } from "@/domain/value-objects/user-role";

const nullableScope = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .transform((value) => value || null);

export const managedUserCreateSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(USER_ROLES),
  branchId: nullableScope,
  customerId: nullableScope,
});

export const managedUserUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(USER_ROLES),
  status: z.enum(USER_STATUSES),
  branchId: nullableScope,
  customerId: nullableScope,
  expectedVersion: z.number().int().nonnegative(),
});
