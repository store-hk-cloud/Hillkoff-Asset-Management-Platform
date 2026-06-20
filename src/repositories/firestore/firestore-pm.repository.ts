import "server-only";

import {
  Timestamp,
  type DocumentData,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";

import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  PmChecklistItem,
  PmJob,
  PmStatus,
} from "@/domain/entities/pm-job";
import { PmError } from "@/domain/errors/pm.error";
import type {
  PmCompletionCommit,
  PmRepository,
} from "@/domain/repositories/pm.repository";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

function string(data: DocumentData, field: string): string {
  if (typeof data[field] !== "string") throw new Error(`Invalid ${field}.`);
  return data[field];
}

function nullableString(data: DocumentData, field: string): string | null {
  return typeof data[field] === "string" ? data[field] : null;
}

function date(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function status(value: unknown): PmStatus {
  if (value === "scheduled" || value === "completed" || value === "cancelled") {
    return value;
  }
  throw new Error("Invalid PM status.");
}

function checklistItem(data: DocumentData): PmChecklistItem {
  return {
    id: string(data, "id"),
    label: string(data, "label"),
    required: data.required === true,
    completed: data.completed === true,
    notes: typeof data.notes === "string" ? data.notes : "",
  };
}

function mapJob(data: DocumentData): PmJob {
  const scheduledAt = date(data.scheduledAt);
  const createdAt = date(data.createdAt);
  const updatedAt = date(data.updatedAt);
  if (!scheduledAt || !createdAt || !updatedAt) {
    throw new Error("Invalid PM timestamps.");
  }
  return {
    id: string(data, "id"),
    jobNumber: string(data, "jobNumber"),
    assetId: createAssetId(string(data, "assetId")),
    assetCode: string(data, "assetCode"),
    assetName: string(data, "assetName"),
    branchId: nullableString(data, "branchId"),
    customerId: nullableString(data, "customerId"),
    title: string(data, "title"),
    scheduledAt,
    assignedTechnicianId: createUserId(string(data, "assignedTechnicianId")),
    assignedTechnicianName: string(data, "assignedTechnicianName"),
    assignmentStatus:
      data.assignmentStatus === "pending" ||
      data.assignmentStatus === "rejected"
        ? data.assignmentStatus
        : "accepted",
    assignmentRespondedAt: date(data.assignmentRespondedAt),
    assignmentRejectionReason: nullableString(
      data,
      "assignmentRejectionReason",
    ),
    status: status(data.status),
    checklist: Array.isArray(data.checklist)
      ? data.checklist.map(checklistItem)
      : [],
    completionNotes:
      typeof data.completionNotes === "string" ? data.completionNotes : "",
    recurrenceMonths:
      typeof data.recurrenceMonths === "number" ? data.recurrenceMonths : null,
    nextDueAt: date(data.nextDueAt),
    completedAt: date(data.completedAt),
    createdAt,
    createdBy: createUserId(string(data, "createdBy")),
    updatedAt,
    updatedBy: createUserId(string(data, "updatedBy")),
    version: Number(data.version),
  };
}

function serialize(job: PmJob): DocumentData {
  return {
    ...job,
    scheduledAt: Timestamp.fromDate(job.scheduledAt),
    nextDueAt: job.nextDueAt ? Timestamp.fromDate(job.nextDueAt) : null,
    completedAt: job.completedAt ? Timestamp.fromDate(job.completedAt) : null,
    assignmentRespondedAt: job.assignmentRespondedAt
      ? Timestamp.fromDate(job.assignmentRespondedAt)
      : null,
    createdAt: Timestamp.fromDate(job.createdAt),
    updatedAt: Timestamp.fromDate(job.updatedAt),
  };
}

export class FirestorePmRepository implements PmRepository {
  constructor(
    private readonly firestore: Firestore = getFirebaseAdminFirestore(),
  ) {}

  createId(): string {
    return this.firestore.collection("pm_jobs").doc().id;
  }

  async findById(id: string): Promise<PmJob | null> {
    const snapshot = await this.firestore.collection("pm_jobs").doc(id).get();
    return snapshot.exists ? mapJob(snapshot.data() ?? {}) : null;
  }

  async list(
    criteria: Parameters<PmRepository["list"]>[0],
  ): Promise<readonly PmJob[]> {
    let query: Query = this.firestore.collection("pm_jobs");

    if (criteria.status !== "all") {
      query = query.where("status", "==", criteria.status);
    }
    if (criteria.technicianId) {
      query = query.where("assignedTechnicianId", "==", criteria.technicianId);
    }
    if (criteria.branchId) {
      query = query.where("branchId", "==", criteria.branchId);
    }
    if (criteria.customerId) {
      query = query.where("customerId", "==", criteria.customerId);
    }
    if (criteria.from) {
      query = query.where("scheduledAt", ">=", criteria.from);
    }
    if (criteria.to) {
      query = query.where("scheduledAt", "<=", criteria.to);
    }

    const snapshot = await query
      .orderBy("scheduledAt", "desc")
      .limit(criteria.limit)
      .get();
    return snapshot.docs.map((document) => mapJob(document.data()));
  }

  async schedule(job: PmJob, auditLog: AuditLog): Promise<void> {
    const jobRef = this.firestore.collection("pm_jobs").doc(job.id);
    const auditRef = this.firestore.collection("audit_logs").doc(auditLog.id);
    await this.firestore.runTransaction(async (transaction) => {
      transaction.create(jobRef, serialize(job));
      transaction.create(auditRef, {
        ...auditLog,
        occurredAt: Timestamp.fromDate(auditLog.occurredAt),
      });
    });
  }

  async complete(commit: PmCompletionCommit): Promise<void> {
    const jobRef = this.firestore.collection("pm_jobs").doc(commit.job.id);
    const eventRef = this.firestore
      .collection("asset_events")
      .doc(commit.assetEvent.id);
    const auditRef = this.firestore
      .collection("audit_logs")
      .doc(commit.auditLog.id);

    await this.firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(jobRef);
      if (!current.exists) {
        throw new PmError("PM_NOT_FOUND", "PM job was not found.");
      }
      if (current.get("version") !== commit.expectedVersion) {
        throw new PmError("PM_VERSION_CONFLICT", "PM job has changed.");
      }
      transaction.set(jobRef, serialize(commit.job));
      transaction.create(eventRef, {
        ...commit.assetEvent,
        occurredAt: Timestamp.fromDate(commit.assetEvent.occurredAt),
      });
      transaction.create(auditRef, {
        ...commit.auditLog,
        occurredAt: Timestamp.fromDate(commit.auditLog.occurredAt),
      });
    });
  }
}
