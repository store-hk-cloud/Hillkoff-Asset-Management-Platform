import { DomainError } from "@/domain/errors/domain-error";

export type WarehouseErrorCode =
  | "WAREHOUSE_ACCESS_DENIED"
  | "ASSET_NOT_FOUND"
  | "ASSET_ARCHIVED"
  | "ASSET_VERSION_CONFLICT"
  | "INVALID_MOVEMENT"
  | "SAME_BRANCH_TRANSFER"
  | "ASSET_ALREADY_SOLD"
  | "TRANSFER_NOT_FOUND"
  | "TRANSFER_VERSION_CONFLICT"
  | "TRANSFER_STATE_CONFLICT"
  | "ASSET_TRANSFER_ACTIVE";

export class WarehouseError extends DomainError {
  constructor(
    readonly code: WarehouseErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
