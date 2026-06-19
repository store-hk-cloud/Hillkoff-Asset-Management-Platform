import { DomainError } from "@/domain/errors/domain-error";

export type AssetErrorCode =
  | "ASSET_NOT_FOUND"
  | "ASSET_CODE_CONFLICT"
  | "ASSET_ARCHIVED"
  | "ASSET_ALREADY_ARCHIVED"
  | "ASSET_VERSION_CONFLICT"
  | "ASSET_ACCESS_DENIED"
  | "INVALID_ASSET";

export class AssetError extends DomainError {
  constructor(
    readonly code: AssetErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
