import type { Asset } from "@/domain/entities/asset";
import type {
  AssetTransfer,
  RejectAssetTransferInput,
} from "@/domain/entities/asset-transfer";
import type { TransferAssetInput } from "@/domain/entities/movement-log";
import type { AssetFieldChange } from "@/domain/entities/asset-event";
import { WarehouseError } from "@/domain/errors/warehouse.error";
import {
  getBranchLocationName,
  isBranchId,
} from "@/domain/master-data/branches";
import type { DomainService } from "@/domain/services/domain-service";
import type { UserId } from "@/domain/value-objects/user-id";
import {
  buildAssetSearchKeywords,
  buildAssetSearchPrefixes,
} from "@/domain/services/asset-search.service";

export interface AssetTransferTransition {
  readonly asset: Asset;
  readonly transfer: AssetTransfer;
  readonly changes: Readonly<Record<string, AssetFieldChange>>;
}

function requireVersion(
  transfer: AssetTransfer,
  expectedVersion: number,
): void {
  if (transfer.version !== expectedVersion) {
    throw new WarehouseError(
      "TRANSFER_VERSION_CONFLICT",
      "The transfer has changed. Reload and try again.",
    );
  }
}

function assetChanges(
  previous: Asset,
  current: Asset,
): Readonly<Record<string, AssetFieldChange>> {
  const fields = [
    "custodyType",
    "branchId",
    "locationName",
    "activeTransferId",
    "lastMovementAt",
  ] as const;
  return Object.fromEntries(
    fields
      .filter((field) => previous[field] !== current[field])
      .map((field) => [
        field,
        { before: previous[field], after: current[field] },
      ]),
  );
}

function withSearch(asset: Asset): Asset {
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

export class AssetTransferService implements DomainService {
  readonly serviceName = "AssetTransferService";

  request(
    id: string,
    current: Asset,
    input: TransferAssetInput,
    actorId: UserId,
    now: Date,
  ): AssetTransferTransition {
    if (
      current.status === "archived" ||
      current.custodyType !== "branch" ||
      !current.branchId
    ) {
      throw new WarehouseError(
        "INVALID_MOVEMENT",
        "Only an active asset held by a branch can be transferred.",
      );
    }
    if (current.activeTransferId) {
      throw new WarehouseError(
        "ASSET_TRANSFER_ACTIVE",
        "This asset already has an active transfer.",
      );
    }
    if (current.version !== input.expectedVersion) {
      throw new WarehouseError(
        "ASSET_VERSION_CONFLICT",
        "The asset has changed. Reload and try again.",
      );
    }
    if (!isBranchId(input.destinationBranchId)) {
      throw new WarehouseError(
        "INVALID_MOVEMENT",
        "Invalid destination branch.",
      );
    }
    if (current.branchId === input.destinationBranchId) {
      throw new WarehouseError(
        "SAME_BRANCH_TRANSFER",
        "Source and destination branch must be different.",
      );
    }

    const transfer: AssetTransfer = {
      id,
      transferNumber: `TRF-${now
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14)}-${id.slice(0, 6).toUpperCase()}`,
      assetId: current.id,
      assetCode: current.assetCode,
      assetName: current.name,
      serialNumber: current.serialNumber,
      sourceBranchId: current.branchId,
      sourceLocationName: current.locationName,
      destinationBranchId: input.destinationBranchId,
      destinationLocationName: getBranchLocationName(input.destinationBranchId),
      status: "pending_dispatch",
      referenceNumber: input.referenceNumber?.trim() || null,
      notes: input.notes.trim(),
      rejectionReason: null,
      requestedAt: now,
      requestedBy: actorId,
      dispatchedAt: null,
      dispatchedBy: null,
      receivedAt: null,
      receivedBy: null,
      returnedAt: null,
      returnedBy: null,
      closedAt: null,
      closedBy: null,
      updatedAt: now,
      version: 0,
    };
    const asset = {
      ...current,
      activeTransferId: id,
      updatedAt: now,
      updatedBy: actorId,
      version: current.version + 1,
    };
    return { asset, transfer, changes: assetChanges(current, asset) };
  }

  dispatch(
    current: Asset,
    transfer: AssetTransfer,
    expectedVersion: number,
    actorId: UserId,
    now: Date,
  ): AssetTransferTransition {
    requireVersion(transfer, expectedVersion);
    if (
      transfer.status !== "pending_dispatch" ||
      current.activeTransferId !== transfer.id
    ) {
      throw new WarehouseError(
        "TRANSFER_STATE_CONFLICT",
        "This transfer cannot be dispatched.",
      );
    }
    const asset = withSearch({
      ...current,
      custodyType: "in_transit",
      branchId: null,
      customerId: null,
      locationName: "ระหว่างขนส่ง",
      lastMovementAt: now,
      updatedAt: now,
      updatedBy: actorId,
      version: current.version + 1,
    });
    return {
      asset,
      transfer: {
        ...transfer,
        status: "in_transit",
        dispatchedAt: now,
        dispatchedBy: actorId,
        updatedAt: now,
        version: transfer.version + 1,
      },
      changes: assetChanges(current, asset),
    };
  }

  receive(
    current: Asset,
    transfer: AssetTransfer,
    expectedVersion: number,
    actorId: UserId,
    now: Date,
  ): AssetTransferTransition {
    requireVersion(transfer, expectedVersion);
    if (
      transfer.status !== "in_transit" ||
      current.activeTransferId !== transfer.id
    ) {
      throw new WarehouseError(
        "TRANSFER_STATE_CONFLICT",
        "This transfer is not ready to receive.",
      );
    }
    const asset = withSearch({
      ...current,
      custodyType: "branch",
      branchId: transfer.destinationBranchId,
      customerId: null,
      locationName: transfer.destinationLocationName,
      activeTransferId: null,
      lastMovementAt: now,
      updatedAt: now,
      updatedBy: actorId,
      version: current.version + 1,
    });
    return {
      asset,
      transfer: {
        ...transfer,
        status: "received",
        receivedAt: now,
        receivedBy: actorId,
        closedAt: now,
        closedBy: actorId,
        updatedAt: now,
        version: transfer.version + 1,
      },
      changes: assetChanges(current, asset),
    };
  }

  cancel(
    current: Asset,
    transfer: AssetTransfer,
    expectedVersion: number,
    actorId: UserId,
    now: Date,
  ): AssetTransferTransition {
    requireVersion(transfer, expectedVersion);
    if (
      transfer.status !== "pending_dispatch" ||
      current.activeTransferId !== transfer.id
    ) {
      throw new WarehouseError(
        "TRANSFER_STATE_CONFLICT",
        "Only a pending transfer can be cancelled.",
      );
    }
    const asset: Asset = {
      ...current,
      activeTransferId: null,
      updatedAt: now,
      updatedBy: actorId,
      version: current.version + 1,
    };
    return {
      asset,
      transfer: {
        ...transfer,
        status: "cancelled",
        closedAt: now,
        closedBy: actorId,
        updatedAt: now,
        version: transfer.version + 1,
      },
      changes: assetChanges(current, asset),
    };
  }

  reject(
    current: Asset,
    transfer: AssetTransfer,
    input: RejectAssetTransferInput,
    actorId: UserId,
    now: Date,
  ): AssetTransferTransition {
    requireVersion(transfer, input.expectedVersion);
    if (
      transfer.status !== "in_transit" ||
      current.activeTransferId !== transfer.id
    ) {
      throw new WarehouseError(
        "TRANSFER_STATE_CONFLICT",
        "Only an in-transit transfer can be rejected.",
      );
    }
    const reason = input.reason.trim();
    if (!reason) {
      throw new WarehouseError(
        "INVALID_MOVEMENT",
        "A rejection reason is required.",
      );
    }
    const asset = withSearch({
      ...current,
      locationName: "อยู่ระหว่างส่งคืนต้นทาง",
      updatedAt: now,
      updatedBy: actorId,
      version: current.version + 1,
    });
    return {
      asset,
      transfer: {
        ...transfer,
        status: "return_in_transit",
        rejectionReason: reason,
        updatedAt: now,
        version: transfer.version + 1,
      },
      changes: assetChanges(current, asset),
    };
  }

  returnToSource(
    current: Asset,
    transfer: AssetTransfer,
    expectedVersion: number,
    actorId: UserId,
    now: Date,
  ): AssetTransferTransition {
    requireVersion(transfer, expectedVersion);
    if (
      transfer.status !== "return_in_transit" ||
      current.activeTransferId !== transfer.id
    ) {
      throw new WarehouseError(
        "TRANSFER_STATE_CONFLICT",
        "This transfer is not ready to return to source stock.",
      );
    }
    const asset = withSearch({
      ...current,
      custodyType: "branch",
      branchId: transfer.sourceBranchId,
      customerId: null,
      locationName: transfer.sourceLocationName,
      activeTransferId: null,
      updatedAt: now,
      updatedBy: actorId,
      version: current.version + 1,
    });
    return {
      asset,
      transfer: {
        ...transfer,
        status: "returned",
        returnedAt: now,
        returnedBy: actorId,
        closedAt: now,
        closedBy: actorId,
        updatedAt: now,
        version: transfer.version + 1,
      },
      changes: assetChanges(current, asset),
    };
  }
}
