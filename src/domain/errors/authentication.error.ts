import { DomainError } from "@/domain/errors/domain-error";

export type AuthenticationErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_DISABLED"
  | "PROFILE_NOT_FOUND"
  | "ROLE_MISMATCH"
  | "FORBIDDEN"
  | "SESSION_EXPIRED"
  | "CSRF_VALIDATION_FAILED"
  | "VERSION_CONFLICT";

export class AuthenticationError extends DomainError {
  constructor(
    readonly code: AuthenticationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
