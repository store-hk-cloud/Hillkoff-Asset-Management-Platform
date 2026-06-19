import { DomainError } from "@/domain/errors/domain-error";

export type InstallationErrorCode =
  | "INSTALLATION_ACCESS_DENIED"
  | "INSTALLATION_NOT_FOUND"
  | "ASSET_NOT_FOUND"
  | "ASSET_ARCHIVED"
  | "ASSET_NOT_ASSIGNED_TO_CUSTOMER"
  | "INSTALLATION_VERSION_CONFLICT"
  | "INVALID_INSTALLATION"
  | "CHECKLIST_INCOMPLETE"
  | "GPS_REQUIRED"
  | "PHOTO_REQUIRED"
  | "TRAINING_REQUIRED"
  | "SIGNATURE_REQUIRED";

export class InstallationError extends DomainError {
  constructor(
    readonly code: InstallationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
