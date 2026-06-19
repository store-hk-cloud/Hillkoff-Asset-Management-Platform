import type {
  InventoryMovement,
  InventoryMovementInput,
  InventoryPart,
  InventoryPartInput,
} from "@/domain/entities/inventory";
import { InventoryError } from "@/domain/errors/inventory.error";
import type { UserId } from "@/domain/value-objects/user-id";

export class InventoryDomainService {
  createPart(
    id: string,
    input: InventoryPartInput,
    actorId: UserId,
    now: Date,
  ): InventoryPart {
    return {
      id,
      partNumber: input.partNumber.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description.trim(),
      unit: input.unit.trim(),
      quantityOnHand: 0,
      reorderPoint: input.reorderPoint,
      unitCost: input.unitCost,
      active: true,
      createdAt: now,
      createdBy: actorId,
      updatedAt: now,
      updatedBy: actorId,
      version: 0,
    };
  }

  updatePart(
    part: InventoryPart,
    input: InventoryPartInput & { expectedVersion: number },
    actorId: UserId,
    now: Date,
  ): InventoryPart {
    this.requireVersion(part, input.expectedVersion);
    return {
      ...part,
      partNumber: input.partNumber.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description.trim(),
      unit: input.unit.trim(),
      reorderPoint: input.reorderPoint,
      unitCost: input.unitCost,
      updatedAt: now,
      updatedBy: actorId,
      version: part.version + 1,
    };
  }

  deactivatePart(
    part: InventoryPart,
    expectedVersion: number,
    actorId: UserId,
    now: Date,
  ): InventoryPart {
    this.requireVersion(part, expectedVersion);
    return {
      ...part,
      active: false,
      updatedAt: now,
      updatedBy: actorId,
      version: part.version + 1,
    };
  }

  move(
    part: InventoryPart,
    input: InventoryMovementInput,
    actorId: UserId,
    now: Date,
    reference: { type: "manual" | "repair"; id: string | null },
  ): { part: InventoryPart; movement: InventoryMovement } {
    this.requireVersion(part, input.expectedVersion);
    if (!part.active) {
      throw new InventoryError(
        "PART_NOT_FOUND",
        "Inactive parts cannot be moved.",
      );
    }
    if (
      (input.type === "adjustment" && input.quantity === 0) ||
      (input.type !== "adjustment" && input.quantity <= 0)
    ) {
      throw new InventoryError(
        "INVALID_STOCK_QUANTITY",
        "Stock quantity must be greater than zero.",
      );
    }
    const delta =
      input.type === "receive"
        ? input.quantity
        : input.type === "issue"
          ? -input.quantity
          : input.quantity;
    const quantityAfter = part.quantityOnHand + delta;
    if (quantityAfter < 0) {
      throw new InventoryError(
        "INSUFFICIENT_STOCK",
        `Insufficient stock for ${part.partNumber}.`,
      );
    }
    const id = crypto.randomUUID();
    const unitCost = input.unitCost ?? part.unitCost;
    const updatedPart: InventoryPart = {
      ...part,
      quantityOnHand: quantityAfter,
      unitCost: input.type === "receive" ? unitCost : part.unitCost,
      updatedAt: now,
      updatedBy: actorId,
      version: part.version + 1,
    };
    return {
      part: updatedPart,
      movement: {
        id,
        movementNumber: `INV-${now
          .toISOString()
          .replace(/\D/g, "")
          .slice(0, 14)}-${id.slice(0, 6).toUpperCase()}`,
        type: input.type,
        partId: part.id,
        partNumber: part.partNumber,
        partName: part.name,
        quantity: input.quantity,
        quantityBefore: part.quantityOnHand,
        quantityAfter,
        unitCost,
        referenceType: reference.type,
        referenceId: reference.id,
        notes: input.notes.trim(),
        occurredAt: now,
        actorId,
      },
    };
  }

  private requireVersion(part: InventoryPart, expectedVersion: number) {
    if (part.version !== expectedVersion) {
      throw new InventoryError(
        "PART_VERSION_CONFLICT",
        "Inventory part has changed. Reload and try again.",
      );
    }
  }
}
