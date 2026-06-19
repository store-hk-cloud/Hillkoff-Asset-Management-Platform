export const USER_ROLES = [
  "admin",
  "warehouse",
  "technician",
  "sales",
  "branch",
  "customer",
  "executive",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.some((role) => role === value);
}
