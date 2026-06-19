import { DomainError } from "@/domain/errors/domain-error";

export type RepairErrorCode =
  | "REPAIR_ACCESS_DENIED"
  | "REPAIR_NOT_FOUND"
  | "REPAIR_VERSION_CONFLICT"
  | "ASSET_NOT_FOUND"
  | "ASSET_ARCHIVED"
  | "INVALID_REPAIR_TRANSITION"
  | "TECHNICIAN_REQUIRED"
  | "ROOT_CAUSE_REQUIRED"
  | "SOLUTION_REQUIRED"
  | "INVALID_REPAIR_EVIDENCE";

export class RepairError extends DomainError {
  constructor(
    readonly code: RepairErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
