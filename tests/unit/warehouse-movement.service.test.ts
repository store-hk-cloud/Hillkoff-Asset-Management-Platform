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
    categoryKey: "other",
    serialNumber: null,
    condition: "operational",
    status: "active",
    custodyType: "branch",
    branchId: "HK1",
    customerId: null,
    locationName: "Warehouse A",
    installedAt: null,
    installationLatitude: null,
    installationLongitude: null,
    lastMovementAt: null,
    activeTransferId: null,
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
        destinationBranchId: "HQ",
        destinationLocationName: "Warehouse B",
        sourceType: "supplier",
        sourceName: "Hillkoff Supplier",
        referenceNumber: null,
        notes: "",
        expectedVersion: 2,
      },
      actorId,
      now,
    );

    expect(transition.asset.custodyType).toBe("branch");
    expect(transition.asset.branchId).toBe("HQ");
    expect(transition.asset.customerId).toBeNull();
    expect(transition.asset.version).toBe(3);
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
    expect(transition.source.branchId).toBe("HK1");
  });

  it("blocks other movement while a transfer is active", () => {
    expect(() =>
      service.sell(
        asset({ activeTransferId: "transfer-1" }),
        {
          assetCode: "HK-001",
          customerId: "customer-a",
          destinationLocationName: "Customer Cafe",
          referenceNumber: null,
          notes: "",
          expectedVersion: 2,
        },
        actorId,
        now,
      ),
    ).toThrowError(WarehouseError);
  });
});
