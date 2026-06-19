import "server-only";

import {
  Timestamp,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";

import type { NfcRegistration } from "@/domain/entities/nfc-registration";
import { AssetIdentityError } from "@/domain/errors/asset-identity.error";
import type {
  AssetIdentityCommit,
  AssetIdentityRepository,
} from "@/domain/repositories/asset-identity.repository";
import { createAssetId, type AssetId } from "@/domain/value-objects/asset-id";
import { createPublicId } from "@/domain/value-objects/public-id";
import { createUserId } from "@/domain/value-objects/user-id";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

function requireString(data: DocumentData, field: string): string {
  const value = data[field];
  if (typeof value !== "string") throw new Error(`Invalid field: ${field}.`);
  return value;
}

function mapRegistration(data: DocumentData): NfcRegistration {
  if (!(data.registeredAt instanceof Timestamp)) {
    throw new Error("Invalid registration timestamp.");
  }

  return {
    id: requireString(data, "id"),
    assetId: createAssetId(requireString(data, "assetId")),
    publicId: createPublicId(requireString(data, "publicId")),
    tagType: data.tagType,
    status: data.status,
    expectedUrl: requireString(data, "expectedUrl"),
    observedUrl: typeof data.observedUrl === "string" ? data.observedUrl : null,
    tagSerialNumber:
      typeof data.tagSerialNumber === "string" ? data.tagSerialNumber : null,
    registeredAt: data.registeredAt.toDate(),
    registeredBy: createUserId(requireString(data, "registeredBy")),
    verifiedAt:
      data.verifiedAt instanceof Timestamp ? data.verifiedAt.toDate() : null,
    verifiedBy:
      typeof data.verifiedBy === "string"
        ? createUserId(data.verifiedBy)
        : null,
    correlationId: requireString(data, "correlationId"),
  };
}

function serializeRegistration(registration: NfcRegistration) {
  return {
    ...registration,
    registeredAt: Timestamp.fromDate(registration.registeredAt),
    verifiedAt: registration.verifiedAt
      ? Timestamp.fromDate(registration.verifiedAt)
      : null,
  };
}

export class FirestoreAssetIdentityRepository implements AssetIdentityRepository {
  constructor(
    private readonly firestore: Firestore = getFirebaseAdminFirestore(),
  ) {}

  async findLatestRegistration(
    assetId: AssetId,
  ): Promise<NfcRegistration | null> {
    const snapshot = await this.firestore
      .collection("nfc_registrations")
      .where("assetId", "==", assetId)
      .orderBy("registeredAt", "desc")
      .limit(1)
      .get();
    const document = snapshot.docs[0];
    return document ? mapRegistration(document.data()) : null;
  }

  async commit(commit: AssetIdentityCommit): Promise<void> {
    const assetReference = this.firestore
      .collection("assets")
      .doc(commit.asset.id);
    const registrationReference = this.firestore
      .collection("nfc_registrations")
      .doc(commit.registration.id);
    const eventReference = this.firestore
      .collection("asset_events")
      .doc(commit.event.id);
    const auditReference = this.firestore
      .collection("audit_logs")
      .doc(commit.auditLog.id);

    await this.firestore.runTransaction(async (transaction) => {
      const assetSnapshot = await transaction.get(assetReference);

      if (!assetSnapshot.exists) {
        throw new AssetIdentityError("ASSET_NOT_FOUND", "Asset was not found.");
      }

      if (assetSnapshot.get("version") !== commit.expectedVersion) {
        throw new AssetIdentityError(
          "ASSET_VERSION_CONFLICT",
          "The asset has changed. Reload and try again.",
        );
      }

      if (!commit.createRegistration) {
        const registrationSnapshot = await transaction.get(
          registrationReference,
        );
        if (!registrationSnapshot.exists) {
          throw new AssetIdentityError(
            "INVALID_NFC_TAG",
            "NFC registration was not found.",
          );
        }
      }

      transaction.update(assetReference, {
        nfcStatus: commit.asset.nfcStatus,
        nfcTagType: commit.asset.nfcTagType,
        nfcRegisteredAt: commit.asset.nfcRegisteredAt
          ? Timestamp.fromDate(commit.asset.nfcRegisteredAt)
          : null,
        nfcVerifiedAt: commit.asset.nfcVerifiedAt
          ? Timestamp.fromDate(commit.asset.nfcVerifiedAt)
          : null,
        updatedAt: Timestamp.fromDate(commit.asset.updatedAt),
        updatedBy: commit.asset.updatedBy,
        version: commit.asset.version,
      });

      if (commit.createRegistration) {
        transaction.create(
          registrationReference,
          serializeRegistration(commit.registration),
        );
      } else {
        transaction.set(
          registrationReference,
          serializeRegistration(commit.registration),
        );
      }

      transaction.create(eventReference, {
        ...commit.event,
        occurredAt: Timestamp.fromDate(commit.event.occurredAt),
      });
      transaction.create(auditReference, {
        ...commit.auditLog,
        occurredAt: Timestamp.fromDate(commit.auditLog.occurredAt),
      });
    });
  }
}
