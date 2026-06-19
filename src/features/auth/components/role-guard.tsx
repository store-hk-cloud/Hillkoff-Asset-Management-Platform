import type { ReactNode } from "react";

import { AccessControlService } from "@/domain/services/access-control.service";
import type { UserRole } from "@/domain/value-objects/user-role";
import { getCurrentSession } from "@/lib/auth/dal";

type RoleGuardProps = Readonly<{
  allowedRoles: readonly UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}>;

export async function RoleGuard({
  allowedRoles,
  children,
  fallback = null,
}: RoleGuardProps) {
  const session = await getCurrentSession();

  if (!session) {
    return fallback;
  }

  const accessControlService = new AccessControlService();
  return accessControlService.hasAnyRole(session.profile.role, allowedRoles)
    ? children
    : fallback;
}
