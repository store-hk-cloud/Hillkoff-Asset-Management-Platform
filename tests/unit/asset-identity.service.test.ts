import { describe, expect, it } from "vitest";

import type { Asset } from "@/domain/entities/asset";
import { AssetIdentityService } from "@/domain/services/asset-identity.service";
import { StaticNdefUrlStrategy } from "@/domain/services/nfc-verification-strategy";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createPublicId } from "@/domain/value-objects/public-id";
import { createUserId } from "@/domain/value-objects/user-id";

const service = new AssetIdentityService();
const actorId = createUserId("admin");
const now = new Date("2026-06-19T00:00:00.000Z");
const publicId = createPublicId("abcdefghijklmnopqrstuv");
const publicUrl = `https://assets.hillkoff.com/app/a/${publicId}`;

function asset(): Asset {
  return {
    id: createAssetId("asset-1"),
    publicId,
    nfcUrl: publicUrl,
    qrUrl: publicUrl,
    assetCode: "HK-001",
    name: "Machine",
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
    locationName: "Warehouse",
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
    version: 1,
    createdAt: now,
    createdBy: actorId,
    updatedAt: now,
    updatedBy: actorId,
    archivedAt: null,
    archivedBy: null,
  };
}

describe("AssetIdentityService", () => {
  it("registers NTAG213 with the canonical asset URL", () => {
    const transition = service.register(
      asset(),
      "ntag213",
      actorId,
      "correlation-1",
      now,
    );

    expect(transition.asset.nfcStatus).toBe("registered");
    expect(transition.registration.expectedUrl).toBe(publicUrl);
    expect(transition.registration.tagType).toBe("ntag213");
  });

  it("verifies a matching static NDEF URL", async () => {
    const registered = service.register(
      asset(),
      "ntag215",
      actorId,
      "correlation-1",
      now,
    );
    const verified = await service.verify(
      registered.asset,
      registered.registration,
      publicUrl,
      "04AABBCC",
      actorId,
      new StaticNdefUrlStrategy(),
      now,
    );

    expect(verified.asset.nfcStatus).toBe("verified");
    expect(verified.registration.status).toBe("verified");
  });

  it("records mismatch for a different URL", async () => {
    const registered = service.register(
      asset(),
      "ntag213",
      actorId,
      "correlation-1",
      now,
    );
    const verified = await service.verify(
      registered.asset,
      registered.registration,
      "https://example.com/fake",
      null,
      actorId,
      new StaticNdefUrlStrategy(),
      now,
    );

    expect(verified.asset.nfcStatus).toBe("mismatch");
  });
});
