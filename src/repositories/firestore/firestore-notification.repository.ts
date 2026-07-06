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
  return value === "repair" || value === "pm" || value === "warranty"
    ? value
    : "system";
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
  async enqueueExpiringWarrantyNotifications(
    daysAhead = 90,
  ): Promise<number> {
    const firestore = getFirebaseAdminFirestore();
    const now = new Date();
    const until = new Date(now.getTime() + daysAhead * 86_400_000);
    const [assets, users, existingWarrantyNotifications] = await Promise.all([
      firestore.collection("assets").get(),
      firestore.collection("users").get(),
      firestore
        .collection("notification_queue")
        .where("type", "==", "warranty")
        .get(),
    ]);
    const existingNotificationIds = new Set(
      existingWarrantyNotifications.docs.map((document) => document.id),
    );
    const recipientUserIds = users.docs
      .filter((document) => {
        const data = document.data();
        return (
          data.status === "active" &&
          (data.role === "admin" || data.role === "executive")
        );
      })
      .map((document) => document.id);

    if (recipientUserIds.length === 0) {
      return 0;
    }

    const batch = firestore.batch();
    let queued = 0;
    for (const document of assets.docs) {
      const data = document.data();
      const warranty = data.warranty ?? {};
      if (
        warranty.status !== "active" ||
        !(warranty.expiresAt instanceof Timestamp)
      ) {
        continue;
      }
      const expiresAt = warranty.expiresAt.toDate();
      if (expiresAt < now || expiresAt > until) {
        continue;
      }
      const daysRemaining = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / 86_400_000,
      );
      const notificationId = `warranty-expiring-${document.id}-${expiresAt
        .toISOString()
        .slice(0, 10)}`;
      if (existingNotificationIds.has(notificationId)) {
        continue;
      }
      batch.set(
        firestore.collection("notification_queue").doc(notificationId),
        {
          type: "warranty",
          status: "pending",
          recipientUserIds,
          title: "Warranty expiring soon",
          body: `${String(data.assetCode ?? document.id)} - ${String(
            data.name ?? "Unknown",
          )} expires in ${daysRemaining} days.`,
          entityType: "warranty",
          entityId: document.id,
          attempts: 0,
          maxAttempts: 3,
          availableAt: Timestamp.fromDate(now),
          lastError: null,
          sentAt: null,
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
        },
      );
      queued += 1;
    }

    if (queued > 0) {
      await batch.commit();
    }
    return queued;
  }

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
          data.entityType === "inventory" ||
          data.entityType === "warranty"
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
