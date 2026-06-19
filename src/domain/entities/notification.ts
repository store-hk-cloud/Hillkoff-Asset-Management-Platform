export const NOTIFICATION_TYPES = ["system", "repair", "pm"] as const;
export const NOTIFICATION_STATUSES = [
  "pending",
  "sent",
  "failed",
  "retry",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface NotificationQueueItem {
  readonly id: string;
  readonly type: NotificationType;
  readonly status: NotificationStatus;
  readonly recipientUserIds: readonly string[];
  readonly title: string;
  readonly body: string;
  readonly entityType: "system" | "repair" | "pm" | "inventory";
  readonly entityId: string | null;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly availableAt: Date;
  readonly lastError: string | null;
  readonly sentAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
