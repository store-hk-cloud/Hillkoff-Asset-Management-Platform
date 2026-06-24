import "server-only";

import {
  Timestamp,
  type DocumentData,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";

import type {
  RepairPartUsed,
  RepairPhoto,
  RepairStatus,
  RepairTicket,
} from "@/domain/entities/repair-ticket";
import { RepairError } from "@/domain/errors/repair.error";
import type {
  RepairCommit,
  RepairRepository,
  RepairSearchCriteria,
} from "@/domain/repositories/repair.repository";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

function requireString(data: DocumentData, field: string): string {
  const value = data[field];
  if (typeof value !== "string") {
    throw new Error(`Invalid repair field: ${field}.`);
  }
  return value;
}

function nullableString(data: DocumentData, field: string): string | null {
  const value = data[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error(`Invalid repair field: ${field}.`);
  }
  return value;
}

function mapDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function mapStatus(value: unknown): RepairStatus {
  if (
    value === "new" ||
    value === "assigned" ||
    value === "in_progress" ||
    value === "waiting_parts" ||
    value === "completed" ||
    value === "closed"
  ) {
    return value;
  }
  throw new Error("Invalid repair status.");
}

function mapPhoto(data: DocumentData): RepairPhoto {
  const uploadedAt = mapDate(data.uploadedAt);
  if (!uploadedAt) throw new Error("Invalid repair photo timestamp.");
  return {
    id: requireString(data, "id"),
    name: requireString(data, "name"),
    storagePath: requireString(data, "storagePath"),
    contentType: requireString(data, "contentType"),
    size: Number(data.size),
    uploadedAt,
    uploadedBy: createUserId(requireString(data, "uploadedBy")),
  };
}

function mapPart(data: DocumentData): RepairPartUsed {
  return {
    id: requireString(data, "id"),
    partNumber: requireString(data, "partNumber"),
    name: requireString(data, "name"),
    quantity: Number(data.quantity),
    unitCost: Number(data.unitCost),
  };
}

function mapTicket(data: DocumentData): RepairTicket {
  const createdAt = mapDate(data.createdAt);
  const updatedAt = mapDate(data.updatedAt);
  if (!createdAt || !updatedAt) {
    throw new Error("Invalid repair timestamps.");
  }

  return {
    id: requireString(data, "id"),
    ticketNumber: requireString(data, "ticketNumber"),
    assetId: createAssetId(requireString(data, "assetId")),
    assetCode: requireString(data, "assetCode"),
    assetName: requireString(data, "assetName"),
    warehouseId: nullableString(data, "warehouseId"),
    customerId: nullableString(data, "customerId"),
    title: requireString(data, "title"),
    description: requireString(data, "description"),
    status: mapStatus(data.status),
    assignedTechnicianId: data.assignedTechnicianId
      ? createUserId(requireString(data, "assignedTechnicianId"))
      : null,
    assignedTechnicianName: nullableString(data, "assignedTechnicianName"),
    assignmentStatus:
      data.assignmentStatus === "pending" ||
      data.assignmentStatus === "accepted" ||
      data.assignmentStatus === "rejected"
        ? data.assignmentStatus
        : data.assignedTechnicianId
          ? "accepted"
          : null,
    assignmentRespondedAt: mapDate(data.assignmentRespondedAt),
    assignmentRejectionReason: nullableString(
      data,
      "assignmentRejectionReason",
    ),
    photos: Array.isArray(data.photos) ? data.photos.map(mapPhoto) : [],
    rootCause: requireString(data, "rootCause"),
    solution: requireString(data, "solution"),
    laborCost: Number(data.laborCost),
    partsUsed: Array.isArray(data.partsUsed) ? data.partsUsed.map(mapPart) : [],
    completedAt: mapDate(data.completedAt),
    closedAt: mapDate(data.closedAt),
    createdAt,
    createdBy: createUserId(requireString(data, "createdBy")),
    updatedAt,
    updatedBy: createUserId(requireString(data, "updatedBy")),
    version: Number(data.version),
  };
}

function serialize(ticket: RepairTicket): DocumentData {
  return {
    ...ticket,
    photos: ticket.photos.map((photo) => ({
      ...photo,
      uploadedAt: Timestamp.fromDate(photo.uploadedAt),
    })),
    completedAt: ticket.completedAt
      ? Timestamp.fromDate(ticket.completedAt)
      : null,
    closedAt: ticket.closedAt ? Timestamp.fromDate(ticket.closedAt) : null,
    assignmentRespondedAt: ticket.assignmentRespondedAt
      ? Timestamp.fromDate(ticket.assignmentRespondedAt)
      : null,
    createdAt: Timestamp.fromDate(ticket.createdAt),
    updatedAt: Timestamp.fromDate(ticket.updatedAt),
  };
}

function serializeInventoryPart(
  part: RepairCommit["inventoryIssues"][number]["part"],
) {
  return {
    ...part,
    createdAt: Timestamp.fromDate(part.createdAt),
    updatedAt: Timestamp.fromDate(part.updatedAt),
  };
}

export class FirestoreRepairRepository implements RepairRepository {
  constructor(
    private readonly firestore: Firestore = getFirebaseAdminFirestore(),
  ) {}

  createId(): string {
    return this.firestore.collection("repair_tickets").doc().id;
  }

  async findById(id: string): Promise<RepairTicket | null> {
    const snapshot = await this.firestore
      .collection("repair_tickets")
      .doc(id)
      .get();
    return snapshot.exists ? mapTicket(snapshot.data() ?? {}) : null;
  }

  async list(criteria: RepairSearchCriteria): Promise<readonly RepairTicket[]> {
    let query: Query = this.firestore.collection("repair_tickets");

    if (criteria.technicianId) {
      query = query.where("assignedTechnicianId", "==", criteria.technicianId);
    }
    if (criteria.warehouseId) {
      query = query.where("warehouseId", "==", criteria.warehouseId);
    }
    if (criteria.customerId) {
      query = query.where("customerId", "==", criteria.customerId);
    }

    const snapshot = await query
      .orderBy("updatedAt", "desc")
      .limit(criteria.limit)
      .get();
    return snapshot.docs.map((document) => mapTicket(document.data()));
  }

  async findLatestOpenByAsset(assetId: string): Promise<RepairTicket | null> {
    const snapshot = await this.firestore
      .collection("repair_tickets")
      .where("assetId", "==", assetId)
      .where("status", "in", [
        "new",
        "assigned",
        "in_progress",
        "waiting_parts",
      ])
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get();
    const document = snapshot.docs[0];
    return document ? mapTicket(document.data()) : null;
  }

  async commit(commit: RepairCommit): Promise<void> {
    const ticketRef = this.firestore
      .collection("repair_tickets")
      .doc(commit.ticket.id);
    const auditRef = this.firestore
      .collection("audit_logs")
      .doc(commit.auditLog.id);
    const eventRef = commit.assetEvent
      ? this.firestore.collection("asset_events").doc(commit.assetEvent.id)
      : null;

    await this.firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(ticketRef);
      const inventorySnapshots = await Promise.all(
        commit.inventoryIssues.map((issue) =>
          transaction.get(
            this.firestore.collection("inventory_parts").doc(issue.part.id),
          ),
        ),
      );

      if (commit.expectedVersion === null) {
        if (current.exists) {
          throw new RepairError(
            "REPAIR_VERSION_CONFLICT",
            "Repair ticket already exists.",
          );
        }
        transaction.create(ticketRef, serialize(commit.ticket));
      } else {
        if (!current.exists) {
          throw new RepairError(
            "REPAIR_NOT_FOUND",
            "Repair ticket was not found.",
          );
        }
        if (current.get("version") !== commit.expectedVersion) {
          throw new RepairError(
            "REPAIR_VERSION_CONFLICT",
            "Repair ticket has changed.",
          );
        }
        transaction.set(ticketRef, serialize(commit.ticket));
      }

      commit.inventoryIssues.forEach((issue, index) => {
        const snapshot = inventorySnapshots[index];
        if (!snapshot?.exists) {
          throw new RepairError(
            "INVALID_REPAIR_EVIDENCE",
            `Inventory part ${issue.part.partNumber} was not found.`,
          );
        }
        if (snapshot.get("version") !== issue.expectedVersion) {
          throw new RepairError(
            "REPAIR_VERSION_CONFLICT",
            `Inventory part ${issue.part.partNumber} has changed.`,
          );
        }
        transaction.set(
          this.firestore.collection("inventory_parts").doc(issue.part.id),
          serializeInventoryPart(issue.part),
        );
        transaction.create(
          this.firestore
            .collection("inventory_movements")
            .doc(issue.movement.id),
          {
            ...issue.movement,
            occurredAt: Timestamp.fromDate(issue.movement.occurredAt),
          },
        );
      });

      if (eventRef && commit.assetEvent) {
        transaction.create(eventRef, {
          ...commit.assetEvent,
          occurredAt: Timestamp.fromDate(commit.assetEvent.occurredAt),
        });
      }
      transaction.create(auditRef, {
        ...commit.auditLog,
        occurredAt: Timestamp.fromDate(commit.auditLog.occurredAt),
      });
    });
  }
}
