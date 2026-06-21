import { describe, expect, it } from "vitest";

import type { Asset } from "@/domain/entities/asset";
import type { UserProfile } from "@/domain/entities/user-profile";
import { AssetAccessService } from "@/domain/services/asset-access.service";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";
import type { UserRole } from "@/domain/value-objects/user-role";

const service = new AssetAccessService();
const now = new Date("2026-06-19T00:00:00.000Z");

const asset: Asset = {
  id: createAssetId("asset-1"),
  assetCode: "HK-001",
  publicId: null,
  nfcUrl: null,
  qrUrl: null,
  name: "Machine",
  description: "",
  category: "Equipment",
  categoryKey: "other",
  serialNumber: null,
  color: "",
  condition: "operational",
  status: "active",
  custodyType: "customer",
  warehouseId: "HK1",
  customerId: "customer-a",
  locationName: "",
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
  createdBy: createUserId("admin"),
  updatedAt: now,
  updatedBy: createUserId("admin"),
  archivedAt: null,
  archivedBy: null,
};

function profile(
  role: UserRole,
  warehouseId: string | null = null,
  customerId: string | null = null,
): UserProfile {
  const uid = createUserId(`${role}-user`);

  return {
    id: uid,
    uid,
    email: `${role}@example.com`,
    displayName: role,
    phoneNumber: null,
    photoURL: null,
    role,
    status: "active",
    warehouseId,
    customerId,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    version: 0,
  };
}

describe("AssetAccessService", () => {
  it("allows only admin and warehouse to mutate assets", () => {
    expect(service.canWrite(profile("admin"))).toBe(true);
    expect(service.canWrite(profile("warehouse"))).toBe(true);
    expect(service.canWrite(profile("technician"))).toBe(false);
    expect(service.canWrite(profile("executive"))).toBe(false);
  });

  it("scopes branch users", () => {
    expect(service.canRead(profile("branch", "HK1"), asset)).toBe(true);
    expect(service.canRead(profile("branch", "HQ"), asset)).toBe(false);
  });

  it("scopes customer users", () => {
    expect(
      service.canRead(profile("customer", null, "customer-a"), asset),
    ).toBe(true);
    expect(
      service.canRead(profile("customer", null, "customer-b"), asset),
    ).toBe(false);
  });
});
