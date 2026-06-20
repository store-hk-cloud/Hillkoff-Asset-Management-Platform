import { DomainError } from "@/domain/errors/domain-error";

export type UserManagementErrorCode =
  | "USER_ACCESS_DENIED"
  | "USER_NOT_FOUND"
  | "USER_EMAIL_CONFLICT"
  | "USER_VERSION_CONFLICT"
  | "INVITATION_INVALID"
  | "INVITATION_EXPIRED"
  | "INVITATION_EMAIL_FAILED"
  | "INVALID_USER_SCOPE"
  | "SELF_MANAGEMENT_DENIED";

export class UserManagementError extends DomainError {
  constructor(
    readonly code: UserManagementErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "UserManagementError";
  }
}
