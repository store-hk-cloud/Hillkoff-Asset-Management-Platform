import { describe, expect, it } from "vitest";

import type {
  ManagedUserUpdateInput,
  UserProfile,
} from "@/domain/entities/user-profile";
import { UserManagementError } from "@/domain/errors/user-management.error";
import { UserAccessService } from "@/domain/services/user-access.service";
import { createUserId } from "@/domain/value-objects/user-id";
import type { UserRole } from "@/domain/value-objects/user-role";

const service = new UserAccessService();
const now = new Date("2026-06-20T00:00:00.000Z");

function profile(role: UserRole): UserProfile {
  const uid = createUserId(`${role}-user`);
  return {
    id: uid,
    uid,
    email: `${role}@example.com`,
    displayName: role,
    phoneNumber: null,
    photoURL: null,
    role,
    status: "active",
    warehouseId: null,
    customerId: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    version: 0,
  };
}

describe("UserAccessService", () => {
  it("allows only active administrators to manage users", () => {
    expect(service.canManage(profile("admin"))).toBe(true);
    expect(service.canManage(profile("warehouse"))).toBe(false);
  });

  it("requires branch and customer scopes", () => {
    expect(() =>
      service.validateCreate({
        email: "branch@example.com",
        displayName: "Branch",
        role: "branch",
        warehouseId: null,
        customerId: null,
      }),
    ).toThrow(UserManagementError);

    expect(
      service.validateCreate({
        email: "customer@example.com",
        displayName: "Customer",
        role: "customer",
        warehouseId: "HK1",
        customerId: "customer-1",
      }),
    ).toMatchObject({ warehouseId: null, customerId: "customer-1" });
  });

  it("prevents administrators from locking themselves out", () => {
    const admin = profile("admin");
    const update: ManagedUserUpdateInput = {
      displayName: admin.displayName,
      role: "warehouse",
      status: "active",
      warehouseId: null,
      customerId: null,
      expectedVersion: 0,
    };

    expect(() => service.validateUpdate(admin, admin.uid, update)).toThrow(
      UserManagementError,
    );
  });
});
