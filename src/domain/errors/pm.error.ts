import { DomainError } from "@/domain/errors/domain-error";

export type PmErrorCode =
  | "PM_ACCESS_DENIED"
  | "PM_NOT_FOUND"
  | "PM_VERSION_CONFLICT"
  | "ASSET_NOT_FOUND"
  | "ASSET_ARCHIVED"
  | "INVALID_PM_STATUS"
  | "PM_CHECKLIST_INCOMPLETE";

export class PmError extends DomainError {
  constructor(
    readonly code: PmErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
