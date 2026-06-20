import "server-only";

import {
  Timestamp,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";

import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  UserInvitation,
  UserInvitationStatus,
} from "@/domain/entities/user-invitation";
import { UserManagementError } from "@/domain/errors/user-management.error";
import type { UserInvitationRepository } from "@/domain/repositories/user-invitation.repository";
import { createUserId, type UserId } from "@/domain/value-objects/user-id";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

function mapInvitation(data: DocumentData): UserInvitation {
  const status = data.status as UserInvitationStatus;
  if (!["pending", "used", "revoked"].includes(status)) {
    throw new Error("Invalid invitation status.");
  }
  return {
    id: String(data.id),
    userId: createUserId(String(data.userId)),
    email: String(data.email),
    displayName: String(data.displayName),
    tokenHash: String(data.tokenHash),
    status,
    expiresAt: (data.expiresAt as Timestamp).toDate(),
    createdAt: (data.createdAt as Timestamp).toDate(),
    createdBy: createUserId(String(data.createdBy)),
    usedAt: data.usedAt instanceof Timestamp ? data.usedAt.toDate() : null,
  };
}

function serializeAudit(auditLog: AuditLog) {
  return {
    ...auditLog,
    occurredAt: Timestamp.fromDate(auditLog.occurredAt),
  };
}

export class FirestoreUserInvitationRepository implements UserInvitationRepository {
  constructor(
    private readonly firestore: Firestore = getFirebaseAdminFirestore(),
  ) {}

  async create(invitation: UserInvitation, auditLog: AuditLog): Promise<void> {
    const invitationRef = this.firestore
      .collection("user_invitations")
      .doc(invitation.id);
    const auditRef = this.firestore.collection("audit_logs").doc(auditLog.id);
    const pending = await this.firestore
      .collection("user_invitations")
      .where("userId", "==", invitation.userId)
      .where("status", "==", "pending")
      .get();

    await this.firestore.runTransaction(async (transaction) => {
      for (const document of pending.docs) {
        transaction.update(document.ref, { status: "revoked" });
      }
      transaction.create(invitationRef, {
        ...invitation,
        expiresAt: Timestamp.fromDate(invitation.expiresAt),
        createdAt: Timestamp.fromDate(invitation.createdAt),
        usedAt: null,
      });
      transaction.create(auditRef, serializeAudit(auditLog));
    });
  }

  async findByTokenHash(tokenHash: string): Promise<UserInvitation | null> {
    const snapshot = await this.firestore
      .collection("user_invitations")
      .doc(tokenHash)
      .get();
    return snapshot.exists ? mapInvitation(snapshot.data() ?? {}) : null;
  }

  async consume(
    tokenHash: string,
    userId: UserId,
    occurredAt: Date,
    auditLog: AuditLog,
  ): Promise<void> {
    const invitationRef = this.firestore
      .collection("user_invitations")
      .doc(tokenHash);
    const userRef = this.firestore.collection("users").doc(userId);
    const auditRef = this.firestore.collection("audit_logs").doc(auditLog.id);

    await this.firestore.runTransaction(async (transaction) => {
      const [invitationSnapshot, userSnapshot] = await Promise.all([
        transaction.get(invitationRef),
        transaction.get(userRef),
      ]);
      if (!invitationSnapshot.exists || !userSnapshot.exists) {
        throw new UserManagementError(
          "INVITATION_INVALID",
          "This invitation is invalid.",
        );
      }
      const invitation = mapInvitation(invitationSnapshot.data() ?? {});
      if (
        invitation.status !== "pending" ||
        invitation.userId !== userId ||
        invitation.expiresAt.getTime() <= occurredAt.getTime()
      ) {
        throw new UserManagementError(
          "INVITATION_INVALID",
          "This invitation is invalid or expired.",
        );
      }
      transaction.update(invitationRef, {
        status: "used",
        usedAt: Timestamp.fromDate(occurredAt),
      });
      if (userSnapshot.get("status") === "invited") {
        transaction.update(userRef, {
          status: "active",
          updatedAt: Timestamp.fromDate(occurredAt),
          version: Number(userSnapshot.get("version") ?? 0) + 1,
        });
      }
      transaction.create(auditRef, serializeAudit(auditLog));
    });
  }
}
