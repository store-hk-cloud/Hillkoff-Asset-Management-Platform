import type { AssetId } from "@/domain/value-objects/asset-id";
import type { UserId } from "@/domain/value-objects/user-id";
import type { UserRole } from "@/domain/value-objects/user-role";

export const MOVEMENT_TYPES = ["warehouse_movement", "customer_sale"] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];
export type MovementEndpointType = "warehouse" | "customer";

export interface MovementEndpoint {
  readonly type: MovementEndpointType;
  readonly name: string;
  readonly warehouseId: string | null;
  readonly customerId: string | null;
  readonly locationName: string;
}

export interface MovementLog {
  readonly id: string;
  readonly movementNumber: string;
  readonly type: MovementType;
  readonly assetId: AssetId;
  readonly assetCode: string;
  readonly assetName: string;
  readonly source: MovementEndpoint;
  readonly destination: MovementEndpoint;
  readonly referenceNumber: string | null;
  readonly notes: string;
  readonly occurredAt: Date;
  readonly actorId: UserId;
  readonly actorDisplayName: string;
  readonly actorRole: UserRole;
  readonly correlationId: string;
}

export interface TransferAssetInput {
  readonly assetCode: string;
  readonly destinationWarehouseId: string;
  readonly destinationLocationName: string;
  readonly referenceNumber: string | null;
  readonly notes: string;
  readonly expectedVersion: number;
}

export interface SellAssetInput {
  readonly assetCode: string;
  readonly customerId: string;
  readonly destinationLocationName: string;
  readonly referenceNumber: string | null;
  readonly notes: string;
  readonly expectedVersion: number;
}
