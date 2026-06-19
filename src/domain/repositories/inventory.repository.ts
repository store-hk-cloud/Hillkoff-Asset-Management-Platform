import type {
  InventoryMovement,
  InventoryPart,
} from "@/domain/entities/inventory";

export interface InventoryRepository {
  createId(): string;
  findById(id: string): Promise<InventoryPart | null>;
  findByPartNumbers(
    partNumbers: readonly string[],
  ): Promise<readonly InventoryPart[]>;
  listParts(): Promise<readonly InventoryPart[]>;
  listMovements(limit: number): Promise<readonly InventoryMovement[]>;
  savePart(part: InventoryPart, expectedVersion: number | null): Promise<void>;
  commitMovement(
    part: InventoryPart,
    movement: InventoryMovement,
    expectedVersion: number,
  ): Promise<void>;
}
