import { describe, expect, it } from "vitest";

import type { Asset } from "@/domain/entities/asset";
import type { PmJob } from "@/domain/entities/pm-job";
import { PmError } from "@/domain/errors/pm.error";
import { PmDomainService } from "@/domain/services/pm-domain.service";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";

const service = new PmDomainService();
const adminId = createUserId("admin-1");
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
    color: "Black",
    description: "",
    category: "Equipment",
    categoryKey: "other",
    serialNumber: null,
    condition: "operational",
    status: "active",
    custodyType: "warehouse",
    warehouseId: "HK1",
    customerId: null,
    locationName: "Branch 1",
    installedAt: null,
    installationLatitude: null,
    installationLongitude: null,
    lastMovementAt: null,
    warranty: {
      status: "inactive",
      startedAt: null,
      expiresAt: null,
      installationId: null,
    },
    nfcStatus: "unregistered",
    nfcTagType: null,
    nfcRegisteredAt: null,
    nfcVerifiedAt: null,
    documents: [],
    searchKeywords: [],
    searchPrefixes: [],
    version: 0,
    createdAt: now,
    createdBy: adminId,
    updatedAt: now,
    updatedBy: adminId,
    archivedAt: null,
    archivedBy: null,
    ...overrides,
  };
}

function scheduled(): PmJob {
  return service.schedule(
    "pm-1",
    asset(),
    {
      assetCode: "HK-001",
      title: "Quarterly PM",
      scheduledAt: new Date("2026-06-25T03:00:00.000Z"),
      assignedTechnicianId: technicianId,
      assignedTechnicianName: "Technician One",
      checklistLabels: ["Clean machine", "Test operation"],
      recurrenceMonths: 3,
    },
    adminId,
    now,
  );
}

describe("PmDomainService", () => {
  it("creates a scheduled PM job with canonical checklist", () => {
    const job = scheduled();

    expect(job.status).toBe("scheduled");
    expect(job.checklist).toHaveLength(2);
    expect(job.checklist.every((item) => item.required)).toBe(true);
  });

  it("rejects PM scheduling for archived assets", () => {
    expect(() =>
      service.schedule(
        "pm-1",
        asset({ status: "archived" }),
        {
          assetCode: "HK-001",
          title: "PM",
          scheduledAt: now,
          assignedTechnicianId: technicianId,
          assignedTechnicianName: "Technician One",
          checklistLabels: ["Test"],
          recurrenceMonths: null,
        },
        adminId,
        now,
      ),
    ).toThrowError(PmError);
  });

  it("requires all original checklist items before completion", () => {
    const job = scheduled();

    expect(() =>
      service.complete(
        job,
        {
          expectedVersion: 0,
          checklist: [{ ...job.checklist[0]!, completed: true }],
          completionNotes: "",
        },
        technicianId,
        now,
      ),
    ).toThrowError(PmError);
  });

  it("completes PM and calculates the next due date", () => {
    const job = scheduled();
    const completed = service.complete(
      job,
      {
        expectedVersion: 0,
        checklist: job.checklist.map((item) => ({
          ...item,
          completed: true,
        })),
        completionNotes: "All checks passed.",
      },
      technicianId,
      now,
    );

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toEqual(now);
    expect(completed.nextDueAt).toEqual(new Date("2026-09-19T10:00:00.000Z"));
    expect(completed.version).toBe(1);
  });
});
