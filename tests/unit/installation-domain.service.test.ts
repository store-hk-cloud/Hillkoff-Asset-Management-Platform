import { describe, expect, it } from "vitest";

import type { Asset } from "@/domain/entities/asset";
import type { CompleteInstallationInput } from "@/domain/entities/installation";
import { InstallationError } from "@/domain/errors/installation.error";
import { InstallationDomainService } from "@/domain/services/installation-domain.service";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";

const service = new InstallationDomainService();
const technicianId = createUserId("technician-1");
const salesId = createUserId("sales-1");
const now = new Date("2026-06-19T03:00:00.000Z");

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
    serialNumber: "SN-001",
    condition: "operational",
    status: "active",
    custodyType: "customer",
    branchId: null,
    customerId: "customer-1",
    locationName: "Customer warehouse",
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
    version: 4,
    createdAt: now,
    createdBy: salesId,
    updatedAt: now,
    updatedBy: salesId,
    archivedAt: null,
    archivedBy: null,
    ...overrides,
  };
}

function scheduledInstallation() {
  return service.schedule(
    "installation-1",
    asset(),
    {
      assetCode: "HK-001",
      customerId: "customer-1",
      customerName: "Hillkoff Cafe",
      address: "Chiang Mai",
      scheduledAt: new Date("2026-06-20T02:00:00.000Z"),
      assignedTechnicianId: technicianId,
      assignedTechnicianName: "Technician One",
      warrantyMonths: 12,
    },
    salesId,
    now,
  );
}

function completionInput(): CompleteInstallationInput {
  const installation = scheduledInstallation();
  return {
    expectedVersion: installation.version,
    checklist: installation.checklist.map((item) => ({
      ...item,
      completed: true,
    })),
    gpsLocation: {
      latitude: 18.7883,
      longitude: 98.9853,
      accuracy: 8,
      capturedAt: now,
    },
    photos: [
      {
        id: "photo-1",
        name: "installed.jpg",
        storagePath: "installations/installation-1/photos/installed.jpg",
        contentType: "image/jpeg",
        size: 1024,
        uploadedAt: now,
        uploadedBy: technicianId,
      },
    ],
    training: {
      completed: true,
      traineeName: "Customer One",
      topics: ["Operation", "Cleaning"],
      notes: "",
    },
    signature: {
      signerName: "Customer One",
      storagePath:
        "installations/installation-1/signature/customer-signature.png",
      signedAt: now,
    },
  };
}

describe("InstallationDomainService", () => {
  it("schedules only assets assigned to the selected customer", () => {
    const installation = scheduledInstallation();

    expect(installation.status).toBe("scheduled");
    expect(installation.customerId).toBe("customer-1");
    expect(installation.checklist).toHaveLength(5);
    expect(installation.checklist.every((item) => item.required)).toBe(true);
  });

  it("rejects an asset that has not been sold to the customer", () => {
    expect(() =>
      service.schedule(
        "installation-1",
        asset({ custodyType: "branch", customerId: null }),
        {
          assetCode: "HK-001",
          customerId: "customer-1",
          customerName: "Hillkoff Cafe",
          address: "Chiang Mai",
          scheduledAt: now,
          assignedTechnicianId: technicianId,
          assignedTechnicianName: "Technician One",
          warrantyMonths: 12,
        },
        salesId,
        now,
      ),
    ).toThrowError(InstallationError);
  });

  it("completes installation and activates warranty on the asset", () => {
    const installation = scheduledInstallation();
    const completedAt = new Date("2026-06-21T03:00:00.000Z");
    const result = service.complete(
      installation,
      asset(),
      completionInput(),
      technicianId,
      completedAt,
    );

    expect(result.installation.status).toBe("completed");
    expect(result.asset.installedAt).toEqual(completedAt);
    expect(result.asset.installationLatitude).toBe(18.7883);
    expect(result.asset.warranty.status).toBe("active");
    expect(result.asset.warranty.installationId).toBe("installation-1");
    expect(result.asset.warranty.expiresAt).toEqual(
      new Date("2027-06-21T03:00:00.000Z"),
    );
    expect(result.asset.version).toBe(5);
  });

  it("requires every completion evidence category", () => {
    const installation = scheduledInstallation();
    const input = completionInput();

    expect(() =>
      service.complete(
        installation,
        asset(),
        { ...input, photos: [] },
        technicianId,
        now,
      ),
    ).toThrowError(InstallationError);

    expect(() =>
      service.complete(
        installation,
        asset(),
        {
          ...input,
          checklist: input.checklist.map((item, index) =>
            index === 0 ? { ...item, completed: false } : item,
          ),
        },
        technicianId,
        now,
      ),
    ).toThrowError(InstallationError);
  });
});
