import { describe, expect, it } from "vitest";

import type { Asset } from "@/domain/entities/asset";
import type { MovementLog } from "@/domain/entities/movement-log";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";
import { buildAssetExportCsv } from "@/lib/exports/asset-export";

const assetId = createAssetId("asset-1");
const userId = createUserId("user-1");

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: assetId,
    version: 1,
    assetCode: "HK-0001",
    publicId: null,
    nfcUrl: null,
    qrUrl: null,
    name: "เครื่องชงกาแฟ, รุ่นทดสอบ",
    description: "",
    category: "Coffee Machine",
    categoryKey: "coffee_machine",
    serialNumber: "SN-1",
    color: "black",
    condition: "operational",
    status: "active",
    custodyType: "warehouse",
    warehouseId: "HQ",
    customerId: null,
    locationName: "Shelf A1",
    installedAt: new Date("2024-01-01T00:00:00.000Z"),
    installationLatitude: null,
    installationLongitude: null,
    lastMovementAt: new Date("2024-06-01T00:00:00.000Z"),
    warranty: {
      status: "inactive",
      startedAt: null,
      expiresAt: null,
      installationId: null,
    },
    nfcStatus: "verified",
    nfcTagType: "ntag213",
    nfcRegisteredAt: new Date("2024-01-02T00:00:00.000Z"),
    nfcVerifiedAt: new Date("2024-01-03T00:00:00.000Z"),
    documents: [],
    searchKeywords: [],
    searchPrefixes: [],
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    createdBy: userId,
    updatedAt: new Date("2024-06-01T00:00:00.000Z"),
    updatedBy: userId,
    archivedAt: null,
    archivedBy: null,
    ...overrides,
  };
}

function makeMovement(overrides: Partial<MovementLog> = {}): MovementLog {
  return {
    id: "mv-1",
    movementNumber: "MV-0001",
    type: "warehouse_movement",
    assetId,
    assetCode: "HK-0001",
    assetName: "เครื่องชงกาแฟ",
    source: {
      type: "warehouse",
      name: "HQ",
      warehouseId: "HQ",
      customerId: null,
      locationName: "Shelf A1",
    },
    destination: {
      type: "warehouse",
      name: "RAT",
      warehouseId: "RAT",
      customerId: null,
      locationName: "Bay 2",
    },
    involvedWarehouseIds: ["HQ", "RAT"],
    referenceNumber: "REF-1",
    notes: "",
    occurredAt: new Date("2024-06-01T00:00:00.000Z"),
    actorId: userId,
    actorDisplayName: "Somchai",
    actorRole: "warehouse",
    correlationId: "corr-1",
    ...overrides,
  };
}

describe("buildAssetExportCsv", () => {
  it("emits a header row and one row per asset with NFC and warehouse columns", () => {
    const csv = buildAssetExportCsv([makeAsset()], []);
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      "Asset Code,Name,Category,Serial Number,Condition,Status,Custody Type,Warehouse ID,Warehouse Name,Location Name,NFC Status,NFC Tag Type,NFC Registered At,NFC Verified At,Last Movement At,Last Movement Type,Last Movement Destination,Last Movement Reference,Installed At,Created At,Updated At",
    );
    expect(lines[1]).toContain("HK-0001");
    expect(lines[1]).toContain("verified");
    expect(lines[1]).toContain("ntag213");
  });

  it("quotes fields containing commas and escapes embedded quotes", () => {
    const csv = buildAssetExportCsv(
      [makeAsset({ name: 'Test "Pro", 2024' })],
      [],
    );
    expect(csv).toContain('"Test ""Pro"", 2024"');
  });

  it("joins in the most recent movement per asset by assetCode", () => {
    const older = makeMovement({
      occurredAt: new Date("2024-01-01T00:00:00.000Z"),
      referenceNumber: "OLD-REF",
    });
    const newer = makeMovement({
      occurredAt: new Date("2024-06-01T00:00:00.000Z"),
      referenceNumber: "NEW-REF",
    });
    const csv = buildAssetExportCsv([makeAsset()], [newer, older]);

    expect(csv).toContain("NEW-REF");
    expect(csv).not.toContain("OLD-REF");
  });

  it("leaves movement columns blank when no movement matches the asset", () => {
    const csv = buildAssetExportCsv(
      [makeAsset({ assetCode: "HK-0002" })],
      [makeMovement({ assetCode: "HK-0001", referenceNumber: "REF-1" })],
    );
    const [, row] = csv.trim().split("\r\n");

    expect(row).toContain("HK-0002");
    expect(row).not.toContain("REF-1");
    // Last Movement Type/Destination/Reference are three consecutive
    // blank columns when no movement matches this asset's code.
    expect(row).toContain(",,,");
  });
});
