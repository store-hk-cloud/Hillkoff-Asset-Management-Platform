import "server-only";

import { createHash } from "node:crypto";

import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";

import type { PublicFeedbackBodyPayload } from "@/features/service-jobs/schemas/feedback.schema";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";
import { FirestoreServiceJobRepository } from "@/repositories/firestore/firestore-service-job.repository";
import { ServiceJobManagementService } from "@/services/service-job-management.service";

export const serviceJobManagementService = new ServiceJobManagementService(
  new FirestoreServiceJobRepository(),
);

function feedbackTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isUsableFeedbackToken(data: DocumentData | undefined, now: Date) {
  return Boolean(
    data &&
    typeof data.jobId === "string" &&
    data.jobId.length > 0 &&
    data.expiresAt instanceof Timestamp &&
    data.expiresAt.toMillis() > now.getTime() &&
    !data.usedAt,
  );
}

export interface PublicFeedbackPersistence {
  isAvailable(tokenHash: string, now: Date): Promise<boolean>;
  consume(
    tokenHash: string,
    feedback: PublicFeedbackBodyPayload,
    now: Date,
  ): Promise<boolean>;
}

function createFirestoreFeedbackPersistence(): PublicFeedbackPersistence {
  const firestore = getFirebaseAdminFirestore();
  return {
    async isAvailable(tokenHash, now) {
      const snapshot = await firestore
        .collection("service_job_feedback_tokens")
        .doc(tokenHash)
        .get();
      return isUsableFeedbackToken(snapshot.data(), now);
    },

    async consume(tokenHash, feedback, now) {
      const tokenRef = firestore
        .collection("service_job_feedback_tokens")
        .doc(tokenHash);
      const feedbackRef = firestore
        .collection("service_job_feedback")
        .doc(tokenHash);

      return firestore.runTransaction(async (transaction) => {
        const tokenSnapshot = await transaction.get(tokenRef);
        const tokenData = tokenSnapshot.data();
        if (!isUsableFeedbackToken(tokenData, now)) return false;

        transaction.create(feedbackRef, {
          jobId: tokenData!.jobId,
          serviceScore: feedback.serviceScore,
          technicianScore: feedback.technicianScore,
          timelinessScore: feedback.timelinessScore,
          comment: feedback.comment,
          submittedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(tokenRef, {
          usedAt: FieldValue.serverTimestamp(),
        });
        return true;
      });
    },
  };
}

export function createPublicServiceJobFeedback(
  persistence: PublicFeedbackPersistence,
  clock: () => Date = () => new Date(),
) {
  return {
    rateLimitKey(token: string, action: "read" | "write"): string {
      return `service-feedback:${action}:${feedbackTokenHash(token)}`;
    },
    isAvailable(token: string): Promise<boolean> {
      return persistence.isAvailable(feedbackTokenHash(token), clock());
    },
    submit(
      token: string,
      feedback: PublicFeedbackBodyPayload,
    ): Promise<boolean> {
      return persistence.consume(feedbackTokenHash(token), feedback, clock());
    },
  };
}

export const publicServiceJobFeedback = createPublicServiceJobFeedback(
  createFirestoreFeedbackPersistence(),
);
