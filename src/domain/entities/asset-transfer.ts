import type { AssetId } from "@/domain/value-objects/asset-id";
import type { UserId } from "@/domain/value-objects/user-id";

export const ASSET_TRANSFER_STATUSES = [
  "pending_dispatch",
  "in_transit",
  "received",
  "cancelled",
  "return_in_transit",
  "returned",
] as const;

export type AssetTransferStatus = (typeof ASSET_TRANSFER_STATUSES)[number];

export interface AssetTransfer {
  readonly id: string;
  readonly transferNumber: string;
  readonly assetId: AssetId;
  readonly assetCode: string;
  readonly assetName: string;
  readonly serialNumber: string | null;
  readonly sourceBranchId: string;
  readonly sourceLocationName: string;
  readonly destinationBranchId: string;
  readonly destinationLocationName: string;
  readonly status: AssetTransferStatus;
  readonly referenceNumber: string | null;
  readonly notes: string;
  readonly rejectionReason: string | null;
  readonly requestedAt: Date;
  readonly requestedBy: UserId;
  readonly dispatchedAt: Date | null;
  readonly dispatchedBy: UserId | null;
  readonly receivedAt: Date | null;
  readonly receivedBy: UserId | null;
  readonly returnedAt: Date | null;
  readonly returnedBy: UserId | null;
  readonly closedAt: Date | null;
  readonly closedBy: UserId | null;
  readonly updatedAt: Date;
  readonly version: number;
}

export interface AssetTransferActionInput {
  readonly expectedVersion: number;
}

export interface ReceiveAssetTransferInput extends AssetTransferActionInput {
  readonly verificationReference: string;
}

export interface RejectAssetTransferInput extends AssetTransferActionInput {
  readonly reason: string;
}
