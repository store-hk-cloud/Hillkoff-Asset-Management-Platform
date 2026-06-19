import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFunctionsAdminApp } from "../config/firebase-admin.js";

export interface NotificationInput {
  type: "system" | "repair" | "pm";
  recipientUserIds: string[];
  title: string;
  body: string;
  entityType: "system" | "repair" | "pm" | "inventory";
  entityId: string | null;
}

export async function enqueueNotification(input: NotificationInput) {
  const now = Timestamp.now();
  await getFirestore(getFunctionsAdminApp())
    .collection("notification_queue")
    .add({
      ...input,
      status: "pending",
      attempts: 0,
      maxAttempts: 5,
      availableAt: now,
      lastError: null,
      sentAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: "cloud-functions",
      serverTimestamp: FieldValue.serverTimestamp(),
    });
}
