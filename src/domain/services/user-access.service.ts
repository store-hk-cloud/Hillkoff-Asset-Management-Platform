import type {
  ManagedUserCreateInput,
  ManagedUserUpdateInput,
  UserProfile,
} from "@/domain/entities/user-profile";
import { UserManagementError } from "@/domain/errors/user-management.error";
import type { DomainService } from "@/domain/services/domain-service";
import type { UserId } from "@/domain/value-objects/user-id";

export class UserAccessService implements DomainService {
  readonly serviceName = "UserAccessService";

  canManage(actor: UserProfile): boolean {
    return actor.role === "admin" && actor.status === "active";
  }

  requireManage(actor: UserProfile): void {
    if (!this.canManage(actor)) {
      throw new UserManagementError(
        "USER_ACCESS_DENIED",
        "Only active administrators can manage users.",
      );
    }
  }

  validateCreate(input: ManagedUserCreateInput): ManagedUserCreateInput {
    return {
      ...input,
      ...this.normalizeScope(input.role, input.branchId, input.customerId),
    };
  }

  validateUpdate(
    actor: UserProfile,
    targetId: UserId,
    input: ManagedUserUpdateInput,
  ): ManagedUserUpdateInput {
    if (
      actor.uid === targetId &&
      (input.role !== "admin" || input.status !== "active")
    ) {
      throw new UserManagementError(
        "SELF_MANAGEMENT_DENIED",
        "Administrators cannot disable or remove their own administrator role.",
      );
    }

    return {
      ...input,
      ...this.normalizeScope(input.role, input.branchId, input.customerId),
    };
  }

  private normalizeScope(
    role: ManagedUserCreateInput["role"],
    branchId: string | null,
    customerId: string | null,
  ): { branchId: string | null; customerId: string | null } {
    if (role === "branch") {
      if (!branchId) {
        throw new UserManagementError(
          "INVALID_USER_SCOPE",
          "Branch users require a Branch ID.",
        );
      }
      return { branchId, customerId: null };
    }

    if (role === "customer") {
      if (!customerId) {
        throw new UserManagementError(
          "INVALID_USER_SCOPE",
          "Customer users require a Customer ID.",
        );
      }
      return { branchId: null, customerId };
    }

    return { branchId: null, customerId: null };
  }
}
