import "server-only";

import {
  Timestamp,
  type DocumentData,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";

import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  Installation,
  InstallationChecklistItem,
  InstallationFile,
  InstallationLocation,
  InstallationStatus,
} from "@/domain/entities/installation";
import { InstallationError } from "@/domain/errors/installation.error";
import type {
  InstallationCompletionCommit,
  InstallationRepository,
} from "@/domain/repositories/installation.repository";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId, type UserId } from "@/domain/value-objects/user-id";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

function string(data: DocumentData, field: string): string {
  if (typeof data[field] !== "string") throw new Error(`Invalid ${field}.`);
  return data[field];
}

function date(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function mapChecklist(data: DocumentData): InstallationChecklistItem {
  return {
    id: string(data, "id"),
    label: string(data, "label"),
    required: data.required === true,
    completed: data.completed === true,
    notes: typeof data.notes === "string" ? data.notes : "",
  };
}

function mapFile(data: DocumentData): InstallationFile {
  const uploadedAt = date(data.uploadedAt);
  if (!uploadedAt) throw new Error("Invalid uploadedAt.");
  return {
    id: string(data, "id"),
    name: string(data, "name"),
    storagePath: string(data, "storagePath"),
    contentType: string(data, "contentType"),
    size: Number(data.size),
    uploadedAt,
    uploadedBy: createUserId(string(data, "uploadedBy")),
  };
}

function mapLocation(data: DocumentData | null): InstallationLocation | null {
  if (!data) return null;
  const capturedAt = date(data.capturedAt);
  if (!capturedAt) throw new Error("Invalid GPS capturedAt.");
  return {
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    accuracy: typeof data.accuracy === "number" ? data.accuracy : null,
    capturedAt,
  };
}

function mapStatus(value: unknown): InstallationStatus {
  if (
    value === "scheduled" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }
  throw new Error("Invalid installation status.");
}

function mapInstallation(data: DocumentData): Installation {
  const scheduledAt = date(data.scheduledAt);
  const createdAt = date(data.createdAt);
  const updatedAt = date(data.updatedAt);
  if (!scheduledAt || !createdAt || !updatedAt) {
    throw new Error("Invalid installation timestamps.");
  }

  return {
    id: string(data, "id"),
    installationNumber: string(data, "installationNumber"),
    assetId: createAssetId(string(data, "assetId")),
    assetCode: string(data, "assetCode"),
    assetName: string(data, "assetName"),
    customerId: string(data, "customerId"),
    customerName: string(data, "customerName"),
    address: string(data, "address"),
    scheduledAt,
    assignedTechnicianId: createUserId(string(data, "assignedTechnicianId")),
    assignedTechnicianName: string(data, "assignedTechnicianName"),
    status: mapStatus(data.status),
    checklist: Array.isArray(data.checklist)
      ? data.checklist.map(mapChecklist)
      : [],
    gpsLocation: mapLocation(data.gpsLocation ?? null),
    photos: Array.isArray(data.photos) ? data.photos.map(mapFile) : [],
    training: {
      completed: data.training?.completed === true,
      traineeName:
        typeof data.training?.traineeName === "string"
          ? data.training.traineeName
          : "",
      topics: Array.isArray(data.training?.topics)
        ? data.training.topics.filter(
            (topic: unknown): topic is string => typeof topic === "string",
          )
        : [],
      notes:
        typeof data.training?.notes === "string" ? data.training.notes : "",
    },
    signature:
      data.signature && date(data.signature.signedAt)
        ? {
            signerName: string(data.signature, "signerName"),
            storagePath: string(data.signature, "storagePath"),
            signedAt: date(data.signature.signedAt)!,
          }
        : null,
    warrantyMonths: Number(data.warrantyMonths),
    startedAt: date(data.startedAt),
    completedAt: date(data.completedAt),
    createdAt,
    createdBy: createUserId(string(data, "createdBy")),
    updatedAt,
    updatedBy: createUserId(string(data, "updatedBy")),
    version: Number(data.version),
  };
}

function serialize(installation: Installation): DocumentData {
  return {
    ...installation,
    scheduledAt: Timestamp.fromDate(installation.scheduledAt),
    gpsLocation: installation.gpsLocation
      ? {
          ...installation.gpsLocation,
          capturedAt: Timestamp.fromDate(installation.gpsLocation.capturedAt),
        }
      : null,
    photos: installation.photos.map((photo) => ({
      ...photo,
      uploadedAt: Timestamp.fromDate(photo.uploadedAt),
    })),
    signature: installation.signature
      ? {
          ...installation.signature,
          signedAt: Timestamp.fromDate(installation.signature.signedAt),
        }
      : null,
    startedAt: installation.startedAt
      ? Timestamp.fromDate(installation.startedAt)
      : null,
    completedAt: installation.completedAt
      ? Timestamp.fromDate(installation.completedAt)
      : null,
    createdAt: Timestamp.fromDate(installation.createdAt),
    updatedAt: Timestamp.fromDate(installation.updatedAt),
  };
}

export class FirestoreInstallationRepository implements InstallationRepository {
  constructor(
    private readonly firestore: Firestore = getFirebaseAdminFirestore(),
  ) {}

  createId(): string {
    return this.firestore.collection("installations").doc().id;
  }

  async findById(id: string): Promise<Installation | null> {
    const snapshot = await this.firestore
      .collection("installations")
      .doc(id)
      .get();
    return snapshot.exists ? mapInstallation(snapshot.data() ?? {}) : null;
  }

  async listQueue(criteria: {
    technicianId: UserId | null;
    customerId: string | null;
    limit: number;
  }): Promise<readonly Installation[]> {
    let query: Query = this.firestore
      .collection("installations")
      .where("status", "in", ["scheduled", "in_progress"]);

    if (criteria.technicianId) {
      query = query.where("assignedTechnicianId", "==", criteria.technicianId);
    }
    if (criteria.customerId) {
      query = query.where("customerId", "==", criteria.customerId);
    }

    const snapshot = await query
      .orderBy("scheduledAt", "asc")
      .limit(criteria.limit)
      .get();
    return snapshot.docs.map((document) => mapInstallation(document.data()));
  }

  async schedule(
    installation: Installation,
    auditLog: AuditLog,
  ): Promise<void> {
    const installationRef = this.firestore
      .collection("installations")
      .doc(installation.id);
    const auditRef = this.firestore.collection("audit_logs").doc(auditLog.id);
    await this.firestore.runTransaction(async (transaction) => {
      transaction.create(installationRef, serialize(installation));
      transaction.create(auditRef, {
        ...auditLog,
        occurredAt: Timestamp.fromDate(auditLog.occurredAt),
      });
    });
  }

  async start(
    installation: Installation,
    auditLog: AuditLog,
    expectedVersion: number,
  ): Promise<void> {
    const installationRef = this.firestore
      .collection("installations")
      .doc(installation.id);
    const auditRef = this.firestore.collection("audit_logs").doc(auditLog.id);
    await this.firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(installationRef);
      if (!current.exists) {
        throw new InstallationError(
          "INSTALLATION_NOT_FOUND",
          "Installation was not found.",
        );
      }
      if (current.get("version") !== expectedVersion) {
        throw new InstallationError(
          "INSTALLATION_VERSION_CONFLICT",
          "Installation has changed.",
        );
      }
      transaction.set(installationRef, serialize(installation));
      transaction.create(auditRef, {
        ...auditLog,
        occurredAt: Timestamp.fromDate(auditLog.occurredAt),
      });
    });
  }

  async complete(commit: InstallationCompletionCommit): Promise<void> {
    const installationRef = this.firestore
      .collection("installations")
      .doc(commit.installation.id);
    const assetRef = this.firestore.collection("assets").doc(commit.asset.id);
    const eventRef = this.firestore
      .collection("asset_events")
      .doc(commit.event.id);
    const auditRef = this.firestore
      .collection("audit_logs")
      .doc(commit.auditLog.id);

    await this.firestore.runTransaction(async (transaction) => {
      const [installationSnapshot, assetSnapshot] = await Promise.all([
        transaction.get(installationRef),
        transaction.get(assetRef),
      ]);
      if (!installationSnapshot.exists || !assetSnapshot.exists) {
        throw new InstallationError(
          "INSTALLATION_NOT_FOUND",
          "Installation or asset was not found.",
        );
      }
      if (
        installationSnapshot.get("version") !==
          commit.expectedInstallationVersion ||
        assetSnapshot.get("version") !== commit.expectedAssetVersion
      ) {
        throw new InstallationError(
          "INSTALLATION_VERSION_CONFLICT",
          "Installation or asset has changed.",
        );
      }

      transaction.set(installationRef, serialize(commit.installation));
      transaction.update(assetRef, {
        installedAt: Timestamp.fromDate(commit.asset.installedAt!),
        installationLatitude: commit.asset.installationLatitude,
        installationLongitude: commit.asset.installationLongitude,
        locationName: commit.asset.locationName,
        warranty: {
          ...commit.asset.warranty,
          startedAt: Timestamp.fromDate(commit.asset.warranty.startedAt!),
          expiresAt: Timestamp.fromDate(commit.asset.warranty.expiresAt!),
        },
        updatedAt: Timestamp.fromDate(commit.asset.updatedAt),
        updatedBy: commit.asset.updatedBy,
        version: commit.asset.version,
      });
      transaction.create(eventRef, {
        ...commit.event,
        occurredAt: Timestamp.fromDate(commit.event.occurredAt),
      });
      transaction.create(auditRef, {
        ...commit.auditLog,
        occurredAt: Timestamp.fromDate(commit.auditLog.occurredAt),
      });
    });
  }
}
