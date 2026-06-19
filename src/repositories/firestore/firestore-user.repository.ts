import "server-only";

import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";

import type {
  UserProfile,
  UserProfileUpdate,
  UserStatus,
} from "@/domain/entities/user-profile";
import { AuthenticationError } from "@/domain/errors/authentication.error";
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
  readonly branchId: string | null;
  readonly customerId: string | null;
  readonly lastLoginAt: Timestamp | null;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}

function isUserStatus(value: unknown): value is UserStatus {
  return value === "active" || value === "disabled";
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
    branchId: requireNullableString(data, "branchId"),
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
