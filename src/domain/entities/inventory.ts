import type { UserId } from "@/domain/value-objects/user-id";

export const INVENTORY_MOVEMENT_TYPES = [
  "receive",
  "issue",
  "adjustment",
] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export interface InventoryPart {
  readonly id: string;
  readonly partNumber: string;
  readonly name: string;
  readonly description: string;
  readonly unit: string;
  readonly quantityOnHand: number;
  readonly reorderPoint: number;
  readonly unitCost: number;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly createdBy: UserId;
  readonly updatedAt: Date;
  readonly updatedBy: UserId;
  readonly version: number;
}

export interface InventoryMovement {
  readonly id: string;
  readonly movementNumber: string;
  readonly type: InventoryMovementType;
  readonly partId: string;
  readonly partNumber: string;
  readonly partName: string;
  readonly quantity: number;
  readonly quantityBefore: number;
  readonly quantityAfter: number;
  readonly unitCost: number;
  readonly referenceType: "manual" | "repair";
  readonly referenceId: string | null;
  readonly notes: string;
  readonly occurredAt: Date;
  readonly actorId: UserId;
}

export interface InventoryPartInput {
  readonly partNumber: string;
  readonly name: string;
  readonly description: string;
  readonly unit: string;
  readonly reorderPoint: number;
  readonly unitCost: number;
}

export interface InventoryMovementInput {
  readonly partId: string;
  readonly type: InventoryMovementType;
  readonly quantity: number;
  readonly unitCost: number | null;
  readonly notes: string;
  readonly expectedVersion: number;
}
