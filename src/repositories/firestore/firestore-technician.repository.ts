import "server-only";

import {
  Timestamp,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";

import type {
  TechnicianAssignmentStatus,
  TechnicianWorkItem,
  TechnicianWorkType,
} from "@/domain/entities/technician-work";
import type {
  TechnicianAssignmentUpdate,
  TechnicianRepository,
} from "@/domain/repositories/technician.repository";
import { TechnicianAssignmentError } from "@/domain/services/technician-assignment.service";
import type { UserId } from "@/domain/value-objects/user-id";
import { createUserId } from "@/domain/value-objects/user-id";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

const COLLECTIONS: Record<TechnicianWorkType, string> = {
  repair: "repair_tickets",
  pm: "pm_jobs",
  installation: "installations",
};

function string(data: DocumentData, field: string): string {
  return typeof data[field] === "string" ? data[field] : "";
}

function date(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function assignmentStatus(data: DocumentData): TechnicianAssignmentStatus {
  return data.assignmentStatus === "pending" ||
    data.assignmentStatus === "rejected"
    ? data.assignmentStatus
    : "accepted";
}

function mapWork(
  type: TechnicianWorkType,
  data: DocumentData,
): TechnicianWorkItem {
  const scheduledAt =
    type === "repair"
      ? (date(data.updatedAt) ?? date(data.createdAt) ?? new Date(0))
      : (date(data.scheduledAt) ?? new Date(0));
  const completedAt =
    type === "installation"
      ? date(data.completedAt)
      : type === "pm"
        ? date(data.completedAt)
        : (date(data.closedAt) ?? date(data.completedAt));
  const status = string(data, "status");
  const terminal =
    status === "completed" || status === "closed" || status === "cancelled";
  return {
    id: string(data, "id"),
    type,
    number:
      type === "repair"
        ? string(data, "ticketNumber")
        : type === "pm"
          ? string(data, "jobNumber")
          : string(data, "installationNumber"),
    title:
      type === "installation"
        ? `ติดตั้ง ${string(data, "assetName")}`
        : string(data, "title"),
    assetId: string(data, "assetId"),
    assetCode: string(data, "assetCode"),
    assetName: string(data, "assetName"),
    scheduledAt,
    workStatus: status,
    assignmentStatus: assignmentStatus(data),
    assignedTechnicianId: createUserId(string(data, "assignedTechnicianId")),
    assignedTechnicianName: string(data, "assignedTechnicianName"),
    rejectionReason:
      typeof data.assignmentRejectionReason === "string"
        ? data.assignmentRejectionReason
        : null,
    href:
      type === "repair"
        ? `/repairs/${string(data, "id")}`
        : type === "pm"
          ? `/pm/${string(data, "id")}`
          : `/installations/${string(data, "id")}`,
    completedAt,
    overdue: !terminal && scheduledAt.getTime() < Date.now() - 86_400_000,
    version: Number(data.version),
  };
}

export class FirestoreTechnicianRepository implements TechnicianRepository {
  constructor(
    private readonly firestore: Firestore = getFirebaseAdminFirestore(),
  ) {}

  async listWork(
    technicianId: UserId,
    limit: number,
  ): Promise<readonly TechnicianWorkItem[]> {
    const results = await Promise.all(
      (Object.entries(COLLECTIONS) as [TechnicianWorkType, string][]).map(
        async ([type, collection]) => {
          const snapshot = await this.firestore
            .collection(collection)
            .where("assignedTechnicianId", "==", technicianId)
            .limit(limit)
            .get();
          return snapshot.docs.map((document) =>
            mapWork(type, document.data()),
          );
        },
      ),
    );
    return results
      .flat()
      .sort(
        (left, right) =>
          right.scheduledAt.getTime() - left.scheduledAt.getTime(),
      )
      .slice(0, limit);
  }

  async findWork(
    type: TechnicianWorkType,
    id: string,
  ): Promise<TechnicianWorkItem | null> {
    const snapshot = await this.firestore
      .collection(COLLECTIONS[type])
      .doc(id)
      .get();
    return snapshot.exists ? mapWork(type, snapshot.data() ?? {}) : null;
  }

  async findWorkByAsset(
    technicianId: UserId,
    assetId: string,
  ): Promise<readonly TechnicianWorkItem[]> {
    const results = await Promise.all(
      (Object.entries(COLLECTIONS) as [TechnicianWorkType, string][]).map(
        async ([type, collection]) => {
          const snapshot = await this.firestore
            .collection(collection)
            .where("assignedTechnicianId", "==", technicianId)
            .where("assetId", "==", assetId)
            .limit(20)
            .get();
          return snapshot.docs.map((document) =>
            mapWork(type, document.data()),
          );
        },
      ),
    );
    return results.flat();
  }

  async updateAssignment(update: TechnicianAssignmentUpdate): Promise<void> {
    const workReference = this.firestore
      .collection(COLLECTIONS[update.workType])
      .doc(update.workId);
    const auditReference = this.firestore
      .collection("audit_logs")
      .doc(update.auditLog.id);
    const eventReference = this.firestore
      .collection("asset_events")
      .doc(update.assetEvent.id);

    await this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(workReference);
      if (!snapshot.exists) {
        throw new TechnicianAssignmentError(
          "TECHNICIAN_WORK_NOT_FOUND",
          "Technician work was not found.",
        );
      }
      if (snapshot.get("version") !== update.expectedVersion) {
        throw new TechnicianAssignmentError(
          "TECHNICIAN_ASSIGNMENT_CONFLICT",
          "The work assignment has changed.",
        );
      }
      transaction.update(workReference, {
        assignedTechnicianId: update.technicianId,
        assignedTechnicianName: update.technicianName,
        assignmentStatus: update.assignmentStatus,
        assignmentRespondedAt: update.respondedAt
          ? Timestamp.fromDate(update.respondedAt)
          : null,
        assignmentRejectionReason: update.rejectionReason,
        ...(update.resetRepairStatus ? { status: "new" } : {}),
        updatedAt: Timestamp.fromDate(update.auditLog.occurredAt),
        updatedBy: update.auditLog.actorId,
        version: update.expectedVersion + 1,
      });
      transaction.create(auditReference, {
        ...update.auditLog,
        occurredAt: Timestamp.fromDate(update.auditLog.occurredAt),
      });
      transaction.create(eventReference, {
        ...update.assetEvent,
        occurredAt: Timestamp.fromDate(update.assetEvent.occurredAt),
      });
    });
  }
}
