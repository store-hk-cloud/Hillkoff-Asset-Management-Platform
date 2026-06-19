import { DomainError } from "@/domain/errors/domain-error";

export type AssetIdentityErrorCode =
  | "IDENTITY_ACCESS_DENIED"
  | "ASSET_NOT_FOUND"
  | "PUBLIC_ID_NOT_FOUND"
  | "PUBLIC_ID_CONFLICT"
  | "NFC_NOT_SUPPORTED"
  | "NFC_URL_MISMATCH"
  | "INVALID_NFC_TAG"
  | "ASSET_VERSION_CONFLICT";

export class AssetIdentityError extends DomainError {
  constructor(
    readonly code: AssetIdentityErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
