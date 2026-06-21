import type {
  Asset,
  AssetCreateInput,
  AssetUpdateInput,
} from "@/domain/entities/asset";
import type { AssetFieldChange } from "@/domain/entities/asset-event";
import { AssetError } from "@/domain/errors/asset.error";
import type { DomainService } from "@/domain/services/domain-service";
import type { AssetId } from "@/domain/value-objects/asset-id";
import type { AssetIdentityProvision } from "@/domain/services/asset-identity.service";
import type { UserId } from "@/domain/value-objects/user-id";
import { isAssetCategoryKey } from "@/domain/master-data/asset-categories";
import {
  buildAssetSearchKeywords,
  buildAssetSearchPrefixes,
} from "@/domain/services/asset-search.service";
import {
  getWarehouseName,
  isWarehouseId,
  type WarehouseId,
} from "@/domain/master-data/warehouses";

export interface AssetTransition {
  readonly asset: Asset;
  readonly changes: Readonly<Record<string, AssetFieldChange>>;
}

type SearchableAssetInput = Pick<
  AssetCreateInput,
  "assetCode" | "name" | "category" | "serialNumber" | "color" | "locationName"
>;

function searchableValues(input: SearchableAssetInput): readonly string[] {
  return [
    input.assetCode,
    input.name,
    input.category,
    input.serialNumber ?? "",
    input.color,
    input.locationName,
  ];
}

function createChanges(
  previous: Asset,
  current: Asset,
): Readonly<Record<string, AssetFieldChange>> {
  const fields = [
    "assetCode",
    "name",
    "description",
    "category",
    "categoryKey",
    "serialNumber",
    "color",
    "condition",
    "status",
    "warehouseId",
    "customerId",
    "locationName",
    "installedAt",
    "archivedAt",
  ] as const;
  const changes: Record<string, AssetFieldChange> = {};

  for (const field of fields) {
    const before = previous[field];
    const after = current[field];
    const beforeValue = before instanceof Date ? before.toISOString() : before;
    const afterValue = after instanceof Date ? after.toISOString() : after;

    if (beforeValue !== afterValue) {
      changes[field] = { before: beforeValue, after: afterValue };
    }
  }

  return changes;
}

export class AssetLifecycleService implements DomainService {
  readonly serviceName = "AssetLifecycleService";

  create(
    id: AssetId,
    input: AssetCreateInput,
    actorId: UserId,
    now: Date,
    identity?: AssetIdentityProvision,
  ): AssetTransition {
    const assetCode = input.assetCode.trim().toUpperCase();
    const name = input.name.trim();
    const category = input.category.trim();
    const categoryKey = input.categoryKey;

    if (!assetCode || !name || !category || !isAssetCategoryKey(categoryKey)) {
      throw new AssetError(
        "INVALID_ASSET",
        "Asset code, name, and category are required.",
      );
    }

    const serialNumber = input.serialNumber.trim().toUpperCase();

    if (!serialNumber) {
      throw new AssetError("INVALID_ASSET", "Serial number is required.");
    }

    const requestedWarehouseId = input.warehouseId.trim();
    if (!isWarehouseId(requestedWarehouseId)) {
      throw new AssetError("INVALID_ASSET", "Invalid warehouse.");
    }
    const warehouseId = requestedWarehouseId as WarehouseId;

    const normalizedInput = {
      assetCode,
      name,
      description: input.description.trim(),
      category,
      categoryKey,
      serialNumber,
      color: input.color.trim(),
      condition: input.condition,
      custodyType:
        input.custodyType ??
        (input.customerId?.trim() ? "customer" : "warehouse"),
      locationName: getWarehouseName(warehouseId),
      warehouseId,
      customerId: input.customerId?.trim() || null,
      installedAt: input.installedAt,
    };
    const asset: Asset = {
      id,
      ...normalizedInput,
      publicId: identity?.publicId ?? null,
      nfcUrl: identity?.urls.nfcUrl ?? null,
      qrUrl: identity?.urls.qrUrl ?? null,
      status: "active",
      lastMovementAt: null,
      installationLatitude: null,
      installationLongitude: null,
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
      searchKeywords: buildAssetSearchKeywords(
        searchableValues(normalizedInput),
      ),
      searchPrefixes: buildAssetSearchPrefixes(
        searchableValues(normalizedInput),
      ),
      version: 0,
      createdAt: now,
      createdBy: actorId,
      updatedAt: now,
      updatedBy: actorId,
      archivedAt: null,
      archivedBy: null,
    };

    return {
      asset,
      changes: {
        created: { before: null, after: assetCode },
      },
    };
  }

  update(
    current: Asset,
    input: AssetUpdateInput,
    actorId: UserId,
    now: Date,
  ): AssetTransition {
    if (current.status === "archived") {
      throw new AssetError(
        "ASSET_ARCHIVED",
        "Archived assets cannot be edited.",
      );
    }

    if (current.version !== input.expectedVersion) {
      throw new AssetError(
        "ASSET_VERSION_CONFLICT",
        "The asset has changed. Reload and try again.",
      );
    }

    const normalizedInput = {
      assetCode: input.assetCode.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      categoryKey: input.categoryKey,
      serialNumber: input.serialNumber.trim().toUpperCase(),
      color: input.color.trim(),
      condition: input.condition,
      installedAt: input.installedAt,
    };
    const updated: Asset = {
      ...current,
      ...normalizedInput,
      searchKeywords: buildAssetSearchKeywords(
        searchableValues({
          ...normalizedInput,
          locationName: current.locationName,
        }),
      ),
      searchPrefixes: buildAssetSearchPrefixes(
        searchableValues({
          ...normalizedInput,
          locationName: current.locationName,
        }),
      ),
      version: current.version + 1,
      updatedAt: now,
      updatedBy: actorId,
    };

    return { asset: updated, changes: createChanges(current, updated) };
  }

  archive(current: Asset, actorId: UserId, now: Date): AssetTransition {
    if (current.status === "archived") {
      throw new AssetError(
        "ASSET_ALREADY_ARCHIVED",
        "The asset is already archived.",
      );
    }

    const archived: Asset = {
      ...current,
      status: "archived",
      version: current.version + 1,
      updatedAt: now,
      updatedBy: actorId,
      archivedAt: now,
      archivedBy: actorId,
    };

    return { asset: archived, changes: createChanges(current, archived) };
  }
}
