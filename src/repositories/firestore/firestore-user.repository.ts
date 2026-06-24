import "server-only";

import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";

import type {
  ManagedUserUpdateInput,
  UserProfile,
  UserProfileUpdate,
  UserStatus,
} from "@/domain/entities/user-profile";
import type { AuditLog } from "@/domain/entities/audit-log";
import { AuthenticationError } from "@/domain/errors/authentication.error";
import { UserManagementError } from "@/domain/errors/user-management.error";
import type { UserRepository } from "@/domain/repositories/user.repository";
import { createUserId, type UserId } from "@/domain/value-objects/user-id";
import { isUserRole } from "@/domain/value-objects/user-role";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

interface UserDocument {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly phoneNumber: string | null;
  readonly photoURL: string | null;
  readonly role: string;
  readonly status: UserStatus;
  readonly warehouseId: string | null;
  readonly customerId: string | null;
  readonly lastLoginAt: Timestamp | null;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}

function isUserStatus(value: unknown): value is UserStatus {
  return value === "invited" || value === "active" || value === "disabled";
}

function requireString(data: DocumentData, field: keyof UserDocument): string {
  const value = data[field];

  if (typeof value !== "string") {
    throw new Error(`Invalid users document field: ${field}.`);
  }

  return value;
}

function requireNullableString(
  data: DocumentData,
  field: keyof UserDocument,
): string | null {
  const value = data[field];

  if (value !== null && typeof value !== "string") {
    throw new Error(`Invalid users document field: ${field}.`);
  }

  return value;
}

function requireTimestamp(
  data: DocumentData,
  field: keyof UserDocument,
): Timestamp {
  const value = data[field];

  if (!(value instanceof Timestamp)) {
    throw new Error(`Invalid users document field: ${field}.`);
  }

  return value;
}

function mapUserDocument(data: DocumentData): UserProfile {
  const uid = createUserId(requireString(data, "uid"));
  const role = data.role;
  const status = data.status;
  const version = data.version;
  const lastLoginAt = data.lastLoginAt;

  if (!isUserRole(role)) {
    throw new Error("Invalid users document role.");
  }

  if (!isUserStatus(status)) {
    throw new Error("Invalid users document status.");
  }

  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error("Invalid users document version.");
  }

  if (lastLoginAt !== null && !(lastLoginAt instanceof Timestamp)) {
    throw new Error("Invalid users document lastLoginAt.");
  }

  return {
    id: uid,
    uid,
    email: requireString(data, "email"),
    displayName: requireString(data, "displayName"),
    phoneNumber: requireNullableString(data, "phoneNumber"),
    photoURL: requireNullableString(data, "photoURL"),
    role,
    status,
    warehouseId: requireNullableString(data, "warehouseId"),
    customerId: requireNullableString(data, "customerId"),
    lastLoginAt: lastLoginAt?.toDate() ?? null,
    createdAt: requireTimestamp(data, "createdAt").toDate(),
    updatedAt: requireTimestamp(data, "updatedAt").toDate(),
    version,
  };
}

export class FirestoreUserRepository implements UserRepository {
  constructor(
    private readonly firestore: Firestore = getFirebaseAdminFirestore(),
  ) {}

  async findById(id: UserId): Promise<UserProfile | null> {
    const snapshot = await this.getReference(id).get();
    return snapshot.exists ? mapUserDocument(snapshot.data() ?? {}) : null;
  }

  async list(): Promise<readonly UserProfile[]> {
    const snapshot = await this.firestore
      .collection("users")
      .orderBy("displayName")
      .limit(500)
      .get();
    return snapshot.docs.map((document) => mapUserDocument(document.data()));
  }

  async createManaged(profile: UserProfile, auditLog: AuditLog): Promise<void> {
    const reference = this.getReference(profile.uid);
    const auditReference = this.firestore
      .collection("audit_logs")
      .doc(auditLog.id);

    await this.firestore.runTransaction(async (transaction) => {
      const existing = await transaction.get(reference);
      if (existing.exists) {
        throw new UserManagementError(
          "USER_EMAIL_CONFLICT",
          "A user profile already exists for this account.",
        );
      }

      transaction.create(reference, mapManagedProfile(profile));
      transaction.create(auditReference, mapAuditLog(auditLog));
    });
  }

  async updateManaged(
    id: UserId,
    update: ManagedUserUpdateInput,
    auditLog: AuditLog,
  ): Promise<UserProfile> {
    const reference = this.getReference(id);
    const auditReference = this.firestore
      .collection("audit_logs")
      .doc(auditLog.id);

    await this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) {
        throw new UserManagementError(
          "USER_NOT_FOUND",
          "User profile was not found.",
        );
      }

      const current = mapUserDocument(snapshot.data() ?? {});
      if (current.version !== update.expectedVersion) {
        throw new UserManagementError(
          "USER_VERSION_CONFLICT",
          "The user changed. Reload and try again.",
        );
      }

      transaction.update(reference, {
        displayName: update.displayName,
        role: update.role,
        status: update.status,
        warehouseId: update.warehouseId,
        customerId: update.customerId,
        updatedAt: FieldValue.serverTimestamp(),
        version: current.version + 1,
      });
      transaction.create(auditReference, mapAuditLog(auditLog));
    });

    const profile = await this.findById(id);
    if (!profile) {
      throw new UserManagementError(
        "USER_NOT_FOUND",
        "User profile was not found after update.",
      );
    }
    return profile;
  }

  async recordAudit(auditLog: AuditLog): Promise<void> {
    await this.firestore
      .collection("audit_logs")
      .doc(auditLog.id)
      .create(mapAuditLog(auditLog));
  }

  async updateProfile(
    id: UserId,
    update: UserProfileUpdate,
  ): Promise<UserProfile> {
    const reference = this.getReference(id);

    await this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);

      if (!snapshot.exists) {
        throw new AuthenticationError(
          "PROFILE_NOT_FOUND",
          "User profile was not found.",
        );
      }

      const currentProfile = mapUserDocument(snapshot.data() ?? {});

      if (currentProfile.version !== update.expectedVersion) {
        throw new AuthenticationError(
          "VERSION_CONFLICT",
          "The profile has changed. Reload and try again.",
        );
      }

      transaction.update(reference, {
        displayName: update.displayName,
        phoneNumber: update.phoneNumber,
        photoURL: update.photoURL,
        updatedAt: FieldValue.serverTimestamp(),
        version: currentProfile.version + 1,
      });
    });

    const updatedProfile = await this.findById(id);

    if (!updatedProfile) {
      throw new AuthenticationError(
        "PROFILE_NOT_FOUND",
        "User profile was not found after update.",
      );
    }

    return updatedProfile;
  }

  async recordLogin(id: UserId): Promise<void> {
    await this.getReference(id).update({
      lastLoginAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      version: FieldValue.increment(1),
    });
  }

  private getReference(id: UserId): DocumentReference {
    return this.firestore.collection("users").doc(id);
  }
}

function mapManagedProfile(profile: UserProfile): UserDocument {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    phoneNumber: profile.phoneNumber,
    photoURL: profile.photoURL,
    role: profile.role,
    status: profile.status,
    warehouseId: profile.warehouseId,
    customerId: profile.customerId,
    lastLoginAt: profile.lastLoginAt
      ? Timestamp.fromDate(profile.lastLoginAt)
      : null,
    createdAt: Timestamp.fromDate(profile.createdAt),
    updatedAt: Timestamp.fromDate(profile.updatedAt),
    version: profile.version,
  };
}

function mapAuditLog(auditLog: AuditLog) {
  return {
    ...auditLog,
    actorId: String(auditLog.actorId),
    occurredAt: Timestamp.fromDate(auditLog.occurredAt),
  };
}
