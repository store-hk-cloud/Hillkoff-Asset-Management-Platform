import type { Asset } from "@/domain/entities/asset";
import type { AssetFieldChange } from "@/domain/entities/asset-event";
import type {
  MovementEndpoint,
  ReceiveAssetInput,
  SellAssetInput,
} from "@/domain/entities/movement-log";
import { WarehouseError } from "@/domain/errors/warehouse.error";
import type { DomainService } from "@/domain/services/domain-service";
import type { UserId } from "@/domain/value-objects/user-id";
import {
  buildAssetSearchKeywords,
  buildAssetSearchPrefixes,
} from "@/domain/services/asset-search.service";
import {
  getBranchLocationName,
  isBranchId,
} from "@/domain/master-data/branches";

export interface WarehouseTransition {
  readonly asset: Asset;
  readonly source: MovementEndpoint;
  readonly destination: MovementEndpoint;
  readonly changes: Readonly<Record<string, AssetFieldChange>>;
}

function endpointFromAsset(asset: Asset): MovementEndpoint {
  return {
    type: asset.custodyType === "customer" ? "customer" : "branch",
    name: asset.locationName,
    externalType: null,
    branchId: asset.branchId,
    customerId: asset.customerId,
    locationName: asset.locationName,
  };
}

function requireMovable(asset: Asset, expectedVersion: number): void {
  if (asset.status === "archived") {
    throw new WarehouseError(
      "ASSET_ARCHIVED",
      "Archived assets cannot be moved.",
    );
  }

  if (asset.version !== expectedVersion) {
    throw new WarehouseError(
      "ASSET_VERSION_CONFLICT",
      "The asset has changed. Reload and try again.",
    );
  }
  if (asset.activeTransferId) {
    throw new WarehouseError(
      "ASSET_TRANSFER_ACTIVE",
      "This asset is locked by an active branch transfer.",
    );
  }
}

function changes(
  previous: Asset,
  current: Asset,
): Readonly<Record<string, AssetFieldChange>> {
  const fields = [
    "custodyType",
    "branchId",
    "customerId",
    "locationName",
    "lastMovementAt",
  ] as const;
  const result: Record<string, AssetFieldChange> = {};

  for (const field of fields) {
    const before = previous[field];
    const after = current[field];
    const beforeValue = before instanceof Date ? before.toISOString() : before;
    const afterValue = after instanceof Date ? after.toISOString() : after;

    if (beforeValue !== afterValue) {
      result[field] = { before: beforeValue, after: afterValue };
    }
  }

  return result;
}

function normalizeRequired(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new WarehouseError("INVALID_MOVEMENT", `${field} is required.`);
  }

  return normalized;
}

function withUpdatedSearch(asset: Asset): Asset {
  const values = [
    asset.assetCode,
    asset.name,
    asset.category,
    asset.serialNumber ?? "",
    asset.locationName,
  ];
  return {
    ...asset,
    searchKeywords: buildAssetSearchKeywords(values),
    searchPrefixes: buildAssetSearchPrefixes(values),
  };
}

export class WarehouseMovementService implements DomainService {
  readonly serviceName = "WarehouseMovementService";

  receive(
    current: Asset,
    input: ReceiveAssetInput,
    actorId: UserId,
    now: Date,
  ): WarehouseTransition {
    requireMovable(current, input.expectedVersion);
    const destinationBranchId = normalizeRequired(
      input.destinationBranchId,
      "Destination branch",
    );
    if (!isBranchId(destinationBranchId)) {
      throw new WarehouseError(
        "INVALID_MOVEMENT",
        "Invalid destination branch.",
      );
    }
    const destinationLocationName = getBranchLocationName(destinationBranchId);
    const updated = withUpdatedSearch({
      ...current,
      custodyType: "branch",
      branchId: destinationBranchId,
      customerId: null,
      locationName: destinationLocationName,
      lastMovementAt: now,
      updatedAt: now,
      updatedBy: actorId,
      version: current.version + 1,
    });

    return {
      asset: updated,
      source: {
        type: "external",
        name: normalizeRequired(input.sourceName, "Source"),
        externalType: input.sourceType,
        branchId: null,
        customerId: null,
        locationName: normalizeRequired(input.sourceName, "Source"),
      },
      destination: endpointFromAsset(updated),
      changes: changes(current, updated),
    };
  }

  sell(
    current: Asset,
    input: SellAssetInput,
    actorId: UserId,
    now: Date,
  ): WarehouseTransition {
    requireMovable(current, input.expectedVersion);

    if (current.custodyType === "customer" && current.customerId) {
      throw new WarehouseError(
        "ASSET_ALREADY_SOLD",
        "The asset is already assigned to a customer.",
      );
    }

    if (!current.branchId) {
      throw new WarehouseError(
        "INVALID_MOVEMENT",
        "The selling branch is required.",
      );
    }

    const customerId = normalizeRequired(input.customerId, "Customer");
    const destinationLocationName = normalizeRequired(
      input.destinationLocationName,
      "Customer location",
    );
    const updated = withUpdatedSearch({
      ...current,
      custodyType: "customer",
      branchId: null,
      customerId,
      locationName: destinationLocationName,
      lastMovementAt: now,
      updatedAt: now,
      updatedBy: actorId,
      version: current.version + 1,
    });

    return {
      asset: updated,
      source: endpointFromAsset(current),
      destination: endpointFromAsset(updated),
      changes: changes(current, updated),
    };
  }
}
