import { DomainError } from "@/domain/errors/domain-error";

export type NotificationErrorCode =
  | "NOTIFICATION_ACCESS_DENIED";

export class NotificationError extends DomainError {
  constructor(
    readonly code: NotificationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}