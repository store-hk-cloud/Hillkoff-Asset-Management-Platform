import { AuthenticationError } from "@/domain/errors/authentication.error";
import type { DomainService } from "@/domain/services/domain-service";
import type { UserRole } from "@/domain/value-objects/user-role";

export class AccessControlService implements DomainService {
  readonly serviceName = "AccessControlService";

  hasAnyRole(role: UserRole, allowedRoles: readonly UserRole[]): boolean {
    return allowedRoles.includes(role);
  }

  requireAnyRole(role: UserRole, allowedRoles: readonly UserRole[]): void {
    if (!this.hasAnyRole(role, allowedRoles)) {
      throw new AuthenticationError(
        "FORBIDDEN",
        "You do not have permission to access this resource.",
      );
    }
  }
}
