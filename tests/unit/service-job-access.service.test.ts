import { describe, expect, it } from "vitest";

import type { UserProfile } from "@/domain/entities/user-profile";
import {
  SERVICE_JOB_ROLE_CAPABILITIES,
  ServiceJobAccessError,
  ServiceJobAccessService,
  type ServiceJobAccessResource,
  type ServiceJobCapability,
} from "@/domain/services/service-job-access.service";
import { createUserId } from "@/domain/value-objects/user-id";
import type { UserRole } from "@/domain/value-objects/user-role";

const now = new Date("2026-08-02T09:00:00.000Z");

function profile(
  role: UserRole,
  overrides: Partial<UserProfile> = {},
): UserProfile {
  const uid = createUserId(`${role}-1`);
  return {
    id: uid,
    uid,
    email: `${role}@example.com`,
    displayName: role,
    phoneNumber: null,
    photoURL: null,
    role,
    status: "active",
    warehouseId: role === "branch" ? "warehouse-1" : null,
    customerId: role === "customer" ? "customer-1" : null,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...overrides,
  };
}

const resource: ServiceJobAccessResource = {
  jobId: "job-1",
  warehouseId: "warehouse-1",
  customerId: "customer-1",
  assignedTechnicianIds: [createUserId("technician-1")],
  assignments: [
    {
      technicianId: createUserId("technician-1"),
      status: "accepted",
    },
  ],
};

describe("ServiceJobAccessService", () => {
  const service = new ServiceJobAccessService();

  it("declares an explicit capability matrix for every existing role", () => {
    const expected: Readonly<
      Record<UserRole, readonly ServiceJobCapability[]>
    > = {
      admin: [
        "list",
        "view",
        "create",
        "update",
        "schedule",
        "assign",
        "respond_assignment",
        "execute",
        "create_assessment",
        "approve_assessment",
        "view_billing",
        "issue_billing",
        "void_billing",
        "issue_inventory",
        "handoff",
        "close",
        "cancel",
        "report",
      ],
      executive: ["list", "view", "view_billing", "report"],
      sales: [
        "list",
        "view",
        "create",
        "update",
        "schedule",
        "create_assessment",
        "view_billing",
      ],
      warehouse: [
        "list",
        "view",
        "create",
        "view_billing",
        "issue_inventory",
        "handoff",
      ],
      technician: [
        "list",
        "view",
        "respond_assignment",
        "execute",
        "create_assessment",
      ],
      branch: ["list", "view", "create"],
      customer: ["list", "view", "approve_assessment", "view_billing"],
    };

    expect(SERVICE_JOB_ROLE_CAPABILITIES).toEqual(expected);
  });

  it.each(["admin", "executive", "sales", "warehouse"] as const)(
    "allows global read scope for %s",
    (role) => {
      expect(service.can(profile(role), "view", resource)).toBe(true);
    },
  );

  it("limits branch reads to the actor warehouse", () => {
    expect(service.can(profile("branch"), "view", resource)).toBe(true);
    expect(
      service.can(
        profile("branch", { warehouseId: "warehouse-2" }),
        "view",
        resource,
      ),
    ).toBe(false);
    expect(
      service.can(profile("branch", { warehouseId: null }), "view", resource),
    ).toBe(false);
  });

  it("limits customer reads and approvals to the actor customer", () => {
    const customer = profile("customer");
    expect(service.can(customer, "view", resource)).toBe(true);
    expect(service.can(customer, "approve_assessment", resource)).toBe(true);
    expect(
      service.can(
        profile("customer", { customerId: "customer-2" }),
        "view",
        resource,
      ),
    ).toBe(false);
    expect(
      service.can(
        profile("customer", { customerId: null }),
        "approve_assessment",
        resource,
      ),
    ).toBe(false);
  });

  it("limits technician work and assignment responses to assigned technicians", () => {
    const assigned = profile("technician");
    const unassigned = profile("technician", {
      id: createUserId("technician-2"),
      uid: createUserId("technician-2"),
    });

    expect(service.can(assigned, "view", resource)).toBe(true);
    expect(service.can(assigned, "execute", resource)).toBe(true);
    expect(
      service.canRespondToAssignment(assigned, createUserId("technician-1"), {
        ...resource,
        assignments: [
          {
            technicianId: createUserId("technician-1"),
            status: "pending",
          },
        ],
      }),
    ).toBe(true);
    expect(service.can(unassigned, "view", resource)).toBe(false);
    expect(service.can(unassigned, "execute", resource)).toBe(false);
    expect(
      service.canRespondToAssignment(
        unassigned,
        createUserId("technician-1"),
        resource,
      ),
    ).toBe(false);
  });

  it.each([
    {
      status: "pending" as const,
      expected: {
        view: true,
        respond_assignment: true,
        execute: false,
        create_assessment: false,
      },
    },
    {
      status: "accepted" as const,
      expected: {
        view: true,
        respond_assignment: false,
        execute: true,
        create_assessment: true,
      },
    },
    {
      status: "rejected" as const,
      expected: {
        view: false,
        respond_assignment: false,
        execute: false,
        create_assessment: false,
      },
    },
  ])(
    "uses $status assignment state for technician scope",
    ({ status, expected }) => {
      const scopedResource: ServiceJobAccessResource = {
        ...resource,
        assignments: [
          {
            technicianId: createUserId("technician-1"),
            status,
          },
        ],
      };
      const technician = profile("technician");

      expect(service.can(technician, "view", scopedResource)).toBe(
        expected.view,
      );
      expect(
        service.can(technician, "respond_assignment", scopedResource),
      ).toBe(expected.respond_assignment);
      expect(service.can(technician, "execute", scopedResource)).toBe(
        expected.execute,
      );
      expect(service.can(technician, "create_assessment", scopedResource)).toBe(
        expected.create_assessment,
      );
    },
  );

  it("does not let read scope grant a capability absent from the role matrix", () => {
    expect(service.can(profile("executive"), "issue_billing", resource)).toBe(
      false,
    );
    expect(service.can(profile("sales"), "assign", resource)).toBe(false);
    expect(
      service.can(profile("warehouse"), "approve_assessment", resource),
    ).toBe(false);
    expect(service.can(profile("branch"), "view_billing", resource)).toBe(
      false,
    );
  });

  it("enforces assessment approver and billing issuer separation", () => {
    expect(() =>
      service.requireBillingSeparation(
        profile("admin"),
        createUserId("customer-approver"),
        null,
      ),
    ).not.toThrow();

    expect(() =>
      service.requireBillingSeparation(
        profile("sales"),
        createUserId("sales-1"),
        null,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "SERVICE_JOB_SEPARATION_OF_DUTIES" }),
    );
  });

  it("allows a same-actor billing issue only for an admin emergency override with a reason", () => {
    const admin = profile("admin");

    expect(() =>
      service.requireBillingSeparation(admin, admin.uid, "  "),
    ).toThrowError(
      expect.objectContaining({ code: "SERVICE_JOB_OVERRIDE_REASON_REQUIRED" }),
    );
    expect(() =>
      service.requireBillingSeparation(
        profile("sales"),
        createUserId("sales-1"),
        "Emergency",
      ),
    ).toThrowError(ServiceJobAccessError);
    expect(
      service.requireBillingSeparation(
        admin,
        admin.uid,
        "Accounting unavailable during outage",
      ),
    ).toEqual({
      emergencyOverride: true,
      reason: "Accounting unavailable during outage",
    });
  });

  it("throws a stable access error when a scoped capability is denied", () => {
    expect(() =>
      service.require(
        profile("branch", { warehouseId: "warehouse-2" }),
        "view",
        resource,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "SERVICE_JOB_ACCESS_DENIED" }),
    );
  });
});
