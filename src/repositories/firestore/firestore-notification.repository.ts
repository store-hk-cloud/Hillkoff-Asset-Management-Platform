import "server-only";

import {
  Timestamp,
  type DocumentData,
  type Query,
} from "firebase-admin/firestore";

import type {
  NotificationQueueItem,
  NotificationStatus,
  NotificationType,
} from "@/domain/entities/notification";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

function string(data: DocumentData, field: string): string {
  return typeof data[field] === "string" ? data[field] : "";
}

function date(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function type(value: unknown): NotificationType {
  return value === "repair" || value === "pm" ? value : "system";
}

function status(value: unknown): NotificationStatus {
  if (
    value === "sent" ||
    value === "failed" ||
    value === "retry" ||
    value === "pending"
  ) {
    return value;
  }
  return "pending";
}

export class FirestoreNotificationRepository {
  async list(
    recipientUserId: string | null = null,
    limit = 200,
  ): Promise<readonly NotificationQueueItem[]> {
    let query: Query =
      getFirebaseAdminFirestore().collection("notification_queue");
    if (recipientUserId) {
      query = query.where(
        "recipientUserIds",
        "array-contains",
        recipientUserId,
      );
    }
    const snapshot = await query
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snapshot.docs.map((document) => {
      const data = document.data();
      const availableAt = date(data.availableAt);
      const createdAt = date(data.createdAt);
      const updatedAt = date(data.updatedAt);
      if (!availableAt || !createdAt || !updatedAt) {
        throw new Error("Invalid notification timestamps.");
      }
      return {
        id: document.id,
        type: type(data.type),
        status: status(data.status),
        recipientUserIds: Array.isArray(data.recipientUserIds)
          ? data.recipientUserIds.filter(
              (value): value is string => typeof value === "string",
            )
          : [],
        title: string(data, "title"),
        body: string(data, "body"),
        entityType:
          data.entityType === "repair" ||
          data.entityType === "pm" ||
          data.entityType === "inventory"
            ? data.entityType
            : "system",
        entityId: typeof data.entityId === "string" ? data.entityId : null,
        attempts: Number(data.attempts),
        maxAttempts: Number(data.maxAttempts),
        availableAt,
        lastError: typeof data.lastError === "string" ? data.lastError : null,
        sentAt: date(data.sentAt),
        createdAt,
        updatedAt,
      };
    });
  }
}
