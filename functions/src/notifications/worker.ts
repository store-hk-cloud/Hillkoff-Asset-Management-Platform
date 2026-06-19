import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { getFunctionsAdminApp } from "../config/firebase-admin.js";

export const processNotificationQueue = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Bangkok",
    retryCount: 0,
  },
  async () => {
    const firestore = getFirestore(getFunctionsAdminApp());
    const snapshot = await firestore
      .collection("notification_queue")
      .where("status", "in", ["pending", "retry"])
      .where("availableAt", "<=", Timestamp.now())
      .limit(50)
      .get();

    await Promise.all(
      snapshot.docs.map(async (document) => {
        await firestore.runTransaction(async (transaction) => {
          const current = await transaction.get(document.ref);
          if (!current.exists) return;
          const data = current.data();
          if (!data || !["pending", "retry"].includes(data.status)) return;
          const attempts = Number(data.attempts ?? 0) + 1;
          try {
            // System/in-app delivery is represented by the durable queue record.
            // Email, FCM, LINE, or other providers plug in at this boundary.
            transaction.update(document.ref, {
              status: "sent",
              attempts,
              sentAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
              lastError: null,
            });
          } catch (error) {
            const maxAttempts = Number(data.maxAttempts ?? 5);
            transaction.update(document.ref, {
              status: attempts >= maxAttempts ? "failed" : "retry",
              attempts,
              availableAt: Timestamp.fromMillis(
                Date.now() + Math.min(60, 2 ** attempts) * 60_000,
              ),
              updatedAt: Timestamp.now(),
              lastError:
                error instanceof Error ? error.message : "Delivery failed.",
            });
          }
        });
      }),
    );
  },
);
