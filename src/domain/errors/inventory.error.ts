import { DomainError } from "@/domain/errors/domain-error";

export type InventoryErrorCode =
  | "INVENTORY_ACCESS_DENIED"
  | "PART_NOT_FOUND"
  | "PART_NUMBER_CONFLICT"
  | "PART_VERSION_CONFLICT"
  | "INSUFFICIENT_STOCK"
  | "INVALID_STOCK_QUANTITY";

export class InventoryError extends DomainError {
  constructor(
    readonly code: InventoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
