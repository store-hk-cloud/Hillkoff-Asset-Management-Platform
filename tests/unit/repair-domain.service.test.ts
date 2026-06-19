import { describe, expect, it } from "vitest";

import type { Asset } from "@/domain/entities/asset";
import type {
  RepairTicket,
  UpdateRepairTicketInput,
} from "@/domain/entities/repair-ticket";
import { RepairError } from "@/domain/errors/repair.error";
import { RepairDomainService } from "@/domain/services/repair-domain.service";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";

const service = new RepairDomainService();
const actorId = createUserId("admin-1");
const technicianId = createUserId("technician-1");
const now = new Date("2026-06-19T10:00:00.000Z");

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: createAssetId("asset-1"),
    assetCode: "HK-001",
    publicId: null,
    nfcUrl: null,
    qrUrl: null,
    name: "Coffee Machine",
    description: "",
    category: "Equipment",
    serialNumber: null,
    condition: "needs_repair",
    status: "active",
    custodyType: "customer",
    branchId: null,
    customerId: "customer-1",
    locationName: "Customer Cafe",
    installedAt: now,
    installationLatitude: null,
    installationLongitude: null,
    lastMovementAt: null,
    warranty: {
      status: "active",
      startedAt: now,
      expiresAt: new Date("2027-06-19T10:00:00.000Z"),
      installationId: "installation-1",
    },
    nfcStatus: "unregistered",
    nfcTagType: null,
    nfcRegisteredAt: null,
    nfcVerifiedAt: null,
    documents: [],
    searchKeywords: [],
    version: 1,
    createdAt: now,
    createdBy: actorId,
    updatedAt: now,
    updatedBy: actorId,
    archivedAt: null,
    archivedBy: null,
    ...overrides,
  };
}

function ticket(): RepairTicket {
  return service.create(
    "repair-1",
    asset(),
    {
      assetCode: "HK-001",
      title: "Water leak",
      description: "Water is leaking under the machine.",
    },
    actorId,
    now,
  );
}

function workInput(
  current: RepairTicket,
  overrides: Partial<UpdateRepairTicketInput> = {},
): UpdateRepairTicketInput {
  return {
    expectedVersion: current.version,
    targetStatus: null,
    photos: [],
    rootCause: "",
    solution: "",
    laborCost: 0,
    partsUsed: [],
    ...overrides,
  };
}

describe("RepairDomainService", () => {
  it("creates a new ticket from an active asset", () => {
    const created = ticket();

    expect(created.status).toBe("new");
    expect(created.assetId).toBe("asset-1");
    expect(created.customerId).toBe("customer-1");
    expect(created.version).toBe(0);
  });

  it("assigns a technician and moves to assigned", () => {
    const current = ticket();
    const assigned = service.assign(
      current,
      {
        expectedVersion: 0,
        technicianId,
        technicianName: "Technician One",
      },
      actorId,
      now,
    );

    expect(assigned.status).toBe("assigned");
    expect(assigned.assignedTechnicianId).toBe(technicianId);
    expect(assigned.version).toBe(1);
  });

  it("enforces the repair status workflow", () => {
    const current = ticket();

    expect(() =>
      service.update(
        current,
        workInput(current, { targetStatus: "completed" }),
        actorId,
        now,
      ),
    ).toThrowError(RepairError);
  });

  it("requires root cause and solution before completion", () => {
    const assigned = service.assign(
      ticket(),
      {
        expectedVersion: 0,
        technicianId,
        technicianName: "Technician One",
      },
      actorId,
      now,
    );
    const inProgress = service.update(
      assigned,
      workInput(assigned, { targetStatus: "in_progress" }),
      technicianId,
      now,
    );

    expect(() =>
      service.update(
        inProgress,
        workInput(inProgress, { targetStatus: "completed" }),
        technicianId,
        now,
      ),
    ).toThrowError(RepairError);

    const completed = service.update(
      inProgress,
      workInput(inProgress, {
        targetStatus: "completed",
        rootCause: "Loose inlet connector",
        solution: "Replaced seal and tightened connector",
        laborCost: 800,
      }),
      technicianId,
      now,
    );
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toEqual(now);
  });

  it("makes closed tickets immutable", () => {
    const closed = { ...ticket(), status: "closed" as const };

    expect(() =>
      service.update(closed, workInput(closed), actorId, now),
    ).toThrowError(RepairError);
  });
});
