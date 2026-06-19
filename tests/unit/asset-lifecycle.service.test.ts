import { describe, expect, it } from "vitest";

import type {
  Asset,
  AssetCreateInput,
  AssetUpdateInput,
} from "@/domain/entities/asset";
import { AssetError } from "@/domain/errors/asset.error";
import { AssetLifecycleService } from "@/domain/services/asset-lifecycle.service";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";

const service = new AssetLifecycleService();
const assetId = createAssetId("asset-1");
const actorId = createUserId("user-1");
const now = new Date("2026-06-19T00:00:00.000Z");

const createInput: AssetCreateInput = {
  assetCode: " hk-001 ",
  name: " Coffee Machine ",
  description: " Main machine ",
  category: " Equipment ",
  serialNumber: " SN-001 ",
  condition: "operational",
  branchId: " branch-a ",
  customerId: null,
  locationName: " Chiang Mai ",
  installedAt: now,
};

function updateInput(expectedVersion: number): AssetUpdateInput {
  return {
    assetCode: createInput.assetCode,
    name: createInput.name,
    description: createInput.description,
    category: createInput.category,
    serialNumber: createInput.serialNumber,
    condition: createInput.condition,
    installedAt: createInput.installedAt,
    expectedVersion,
  };
}

function createAsset(): Asset {
  return service.create(assetId, createInput, actorId, now).asset;
}

describe("AssetLifecycleService", () => {
  it("normalizes and creates an active asset", () => {
    const transition = service.create(assetId, createInput, actorId, now);

    expect(transition.asset.assetCode).toBe("HK-001");
    expect(transition.asset.name).toBe("Coffee Machine");
    expect(transition.asset.status).toBe("active");
    expect(transition.asset.version).toBe(0);
    expect(transition.asset.searchKeywords).toContain("hk-001");
    expect(transition.changes).toHaveProperty("created");
  });

  it("updates editable fields without leaking expectedVersion", () => {
    const current = createAsset();
    const update: AssetUpdateInput = {
      ...updateInput(0),
      name: "Updated Machine",
    };
    const transition = service.update(
      current,
      update,
      actorId,
      new Date("2026-06-20T00:00:00.000Z"),
    );

    expect(transition.asset.name).toBe("Updated Machine");
    expect(transition.asset.version).toBe(1);
    expect("expectedVersion" in transition.asset).toBe(false);
    expect(transition.changes.name).toEqual({
      before: "Coffee Machine",
      after: "Updated Machine",
    });
  });

  it("rejects stale updates", () => {
    const current = createAsset();

    expect(() =>
      service.update(current, updateInput(4), actorId, now),
    ).toThrowError(AssetError);
  });

  it("archives without deleting the aggregate", () => {
    const transition = service.archive(createAsset(), actorId, now);

    expect(transition.asset.status).toBe("archived");
    expect(transition.asset.archivedAt).toEqual(now);
    expect(transition.asset.version).toBe(1);
    expect(transition.changes.status).toEqual({
      before: "active",
      after: "archived",
    });
  });

  it("rejects editing archived assets", () => {
    const archived = service.archive(createAsset(), actorId, now).asset;

    expect(() =>
      service.update(archived, updateInput(archived.version), actorId, now),
    ).toThrowError(AssetError);
  });
});
