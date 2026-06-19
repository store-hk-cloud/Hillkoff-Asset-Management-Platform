import { describe, expect, it } from "vitest";

import type { Asset } from "@/domain/entities/asset";
import { WarehouseError } from "@/domain/errors/warehouse.error";
import { WarehouseMovementService } from "@/domain/services/warehouse-movement.service";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";

const service = new WarehouseMovementService();
const actorId = createUserId("warehouse-user");
const now = new Date("2026-06-19T12:00:00.000Z");

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
    condition: "operational",
    status: "active",
    custodyType: "branch",
    branchId: "branch-a",
    customerId: null,
    locationName: "Warehouse A",
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
    version: 2,
    createdAt: now,
    createdBy: actorId,
    updatedAt: now,
    updatedBy: actorId,
    archivedAt: null,
    archivedBy: null,
    ...overrides,
  };
}

describe("WarehouseMovementService", () => {
  it("receives an asset into a branch and clears customer custody", () => {
    const transition = service.receive(
      asset({
        custodyType: "customer",
        customerId: "customer-a",
      }),
      {
        assetCode: "HK-001",
        destinationBranchId: "branch-b",
        destinationLocationName: "Warehouse B",
        referenceNumber: null,
        notes: "",
        expectedVersion: 2,
      },
      actorId,
      now,
    );

    expect(transition.asset.custodyType).toBe("branch");
    expect(transition.asset.branchId).toBe("branch-b");
    expect(transition.asset.customerId).toBeNull();
    expect(transition.asset.version).toBe(3);
  });

  it("transfers between different branches", () => {
    const transition = service.transfer(
      asset(),
      {
        assetCode: "HK-001",
        destinationBranchId: "branch-b",
        destinationLocationName: "Branch B",
        referenceNumber: "TR-001",
        notes: "",
        expectedVersion: 2,
      },
      actorId,
      now,
    );

    expect(transition.source.branchId).toBe("branch-a");
    expect(transition.destination.branchId).toBe("branch-b");
  });

  it("rejects transfer to the same branch", () => {
    expect(() =>
      service.transfer(
        asset(),
        {
          assetCode: "HK-001",
          destinationBranchId: "branch-a",
          destinationLocationName: "Warehouse A",
          referenceNumber: null,
          notes: "",
          expectedVersion: 2,
        },
        actorId,
        now,
      ),
    ).toThrowError(WarehouseError);
  });

  it("sells a branch asset to a customer", () => {
    const transition = service.sell(
      asset(),
      {
        assetCode: "HK-001",
        customerId: "customer-a",
        destinationLocationName: "Customer Cafe",
        referenceNumber: "SO-001",
        notes: "",
        expectedVersion: 2,
      },
      actorId,
      now,
    );

    expect(transition.asset.custodyType).toBe("customer");
    expect(transition.asset.branchId).toBeNull();
    expect(transition.asset.customerId).toBe("customer-a");
    expect(transition.source.branchId).toBe("branch-a");
  });

  it("rejects stale and archived movements", () => {
    const input = {
      assetCode: "HK-001",
      destinationBranchId: "branch-b",
      destinationLocationName: "Branch B",
      referenceNumber: null,
      notes: "",
      expectedVersion: 1,
    };

    expect(() => service.transfer(asset(), input, actorId, now)).toThrowError(
      WarehouseError,
    );
    expect(() =>
      service.transfer(
        asset({ status: "archived" }),
        { ...input, expectedVersion: 2 },
        actorId,
        now,
      ),
    ).toThrowError(WarehouseError);
  });
});
