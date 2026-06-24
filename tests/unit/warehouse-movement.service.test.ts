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
    serialNumber: "SN-001",
    color: "Black",
    condition: "operational",
    status: "active",
    custodyType: "warehouse",
    warehouseId: "HK1",
    customerId: null,
    locationName: "Hillkoff 1",
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
  it("moves an asset directly between warehouses", () => {
    const transition = service.transfer(
      asset(),
      {
        assetCode: "HK-001",
        destinationWarehouseId: "Z03",
        destinationLocationName: "คลังบ้านเช่า 2",
        referenceNumber: "MOVE-001",
        notes: "",
        expectedVersion: 2,
      },
      actorId,
      now,
    );

    expect(transition.asset.warehouseId).toBe("Z03");
    expect(transition.asset.locationName).toBe("คลังบ้านเช่า 2");
    expect(transition.asset.version).toBe(3);
    expect(transition.source.warehouseId).toBe("HK1");
    expect(transition.destination.warehouseId).toBe("Z03");
  });

  it("prevents a move to the current warehouse", () => {
    expect(() =>
      service.transfer(
        asset(),
        {
          assetCode: "HK-001",
          destinationWarehouseId: "HK1",
          destinationLocationName: "Hillkoff 1",
          referenceNumber: null,
          notes: "",
          expectedVersion: 2,
        },
        actorId,
        now,
      ),
    ).toThrowError(WarehouseError);
  });

  it("sells a warehouse asset to a customer", () => {
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
    expect(transition.asset.warehouseId).toBeNull();
    expect(transition.asset.customerId).toBe("customer-a");
    expect(transition.source.warehouseId).toBe("HK1");
  });
});
