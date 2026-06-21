import { describe, expect, it } from "vitest";

import type { Asset } from "@/domain/entities/asset";
import { WarehouseError } from "@/domain/errors/warehouse.error";
import { AssetTransferService } from "@/domain/services/asset-transfer.service";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";

const service = new AssetTransferService();
const actorId = createUserId("warehouse-user");
const now = new Date("2026-06-20T00:00:00.000Z");

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: createAssetId("asset-1"),
    assetCode: "HK-001",
    publicId: null,
    nfcUrl: null,
    qrUrl: null,
    name: "Coffee Machine",
    description: "",
    category: "เครื่องชง",
    categoryKey: "coffee_machine",
    serialNumber: "SN-001",
    condition: "operational",
    status: "active",
    custodyType: "branch",
    branchId: "HK1",
    customerId: null,
    locationName: "ช้างเผือก",
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

function requested() {
  return service.request(
    "transfer-1",
    asset(),
    {
      assetCode: "HK-001",
      destinationWarehouseId: "HQ",
      destinationLocationName: "สำนักงานใหญ่",
      referenceNumber: "TR-001",
      notes: "",
      expectedVersion: 2,
    },
    actorId,
    now,
  );
}

describe("AssetTransferService", () => {
  it("reserves source stock until dispatch", () => {
    const result = requested();
    expect(result.transfer.status).toBe("pending_dispatch");
    expect(result.asset.branchId).toBe("HK1");
    expect(result.asset.activeTransferId).toBe("transfer-1");
  });

  it("removes dispatched assets from every branch stock", () => {
    const request = requested();
    const result = service.dispatch(
      request.asset,
      request.transfer,
      0,
      actorId,
      now,
    );
    expect(result.transfer.status).toBe("in_transit");
    expect(result.asset.custodyType).toBe("in_transit");
    expect(result.asset.branchId).toBeNull();
  });

  it("adds stock only after destination receipt", () => {
    const request = requested();
    const dispatch = service.dispatch(
      request.asset,
      request.transfer,
      0,
      actorId,
      now,
    );
    const result = service.receive(
      dispatch.asset,
      dispatch.transfer,
      1,
      actorId,
      now,
    );
    expect(result.transfer.status).toBe("received");
    expect(result.asset.branchId).toBe("HQ");
    expect(result.asset.activeTransferId).toBeNull();
  });

  it("prevents a second active transfer", () => {
    expect(() =>
      service.request(
        "transfer-2",
        asset({ activeTransferId: "transfer-1" }),
        {
          assetCode: "HK-001",
          destinationWarehouseId: "HQ",
          destinationLocationName: "สำนักงานใหญ่",
          referenceNumber: null,
          notes: "",
          expectedVersion: 2,
        },
        actorId,
        now,
      ),
    ).toThrowError(WarehouseError);
  });

  it("keeps rejected assets outside stock until source confirms return", () => {
    const request = requested();
    const dispatch = service.dispatch(
      request.asset,
      request.transfer,
      0,
      actorId,
      now,
    );
    const rejected = service.reject(
      dispatch.asset,
      dispatch.transfer,
      { expectedVersion: 1, reason: "Damaged packaging" },
      actorId,
      now,
    );
    expect(rejected.transfer.status).toBe("return_in_transit");
    expect(rejected.asset.branchId).toBeNull();

    const returned = service.returnToSource(
      rejected.asset,
      rejected.transfer,
      2,
      actorId,
      now,
    );
    expect(returned.transfer.status).toBe("returned");
    expect(returned.asset.branchId).toBe("HK1");
  });
});
