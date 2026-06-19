import "server-only";

import {
  Timestamp,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";

import type {
  InventoryMovement,
  InventoryMovementType,
  InventoryPart,
} from "@/domain/entities/inventory";
import { InventoryError } from "@/domain/errors/inventory.error";
import type { InventoryRepository } from "@/domain/repositories/inventory.repository";
import { createUserId } from "@/domain/value-objects/user-id";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

function string(data: DocumentData, field: string): string {
  if (typeof data[field] !== "string") throw new Error(`Invalid ${field}.`);
  return data[field];
}

function date(value: unknown): Date {
  if (!(value instanceof Timestamp)) throw new Error("Invalid timestamp.");
  return value.toDate();
}

function movementType(value: unknown): InventoryMovementType {
  if (value === "receive" || value === "issue" || value === "adjustment") {
    return value;
  }
  throw new Error("Invalid inventory movement type.");
}

function mapPart(data: DocumentData): InventoryPart {
  return {
    id: string(data, "id"),
    partNumber: string(data, "partNumber"),
    name: string(data, "name"),
    description: string(data, "description"),
    unit: string(data, "unit"),
    quantityOnHand: Number(data.quantityOnHand),
    reorderPoint: Number(data.reorderPoint),
    unitCost: Number(data.unitCost),
    active: data.active === true,
    createdAt: date(data.createdAt),
    createdBy: createUserId(string(data, "createdBy")),
    updatedAt: date(data.updatedAt),
    updatedBy: createUserId(string(data, "updatedBy")),
    version: Number(data.version),
  };
}

function mapMovement(data: DocumentData): InventoryMovement {
  return {
    id: string(data, "id"),
    movementNumber: string(data, "movementNumber"),
    type: movementType(data.type),
    partId: string(data, "partId"),
    partNumber: string(data, "partNumber"),
    partName: string(data, "partName"),
    quantity: Number(data.quantity),
    quantityBefore: Number(data.quantityBefore),
    quantityAfter: Number(data.quantityAfter),
    unitCost: Number(data.unitCost),
    referenceType: data.referenceType === "repair" ? "repair" : "manual",
    referenceId: typeof data.referenceId === "string" ? data.referenceId : null,
    notes: string(data, "notes"),
    occurredAt: date(data.occurredAt),
    actorId: createUserId(string(data, "actorId")),
  };
}

function serializePart(part: InventoryPart) {
  return {
    ...part,
    createdAt: Timestamp.fromDate(part.createdAt),
    updatedAt: Timestamp.fromDate(part.updatedAt),
  };
}

export class FirestoreInventoryRepository implements InventoryRepository {
  constructor(
    private readonly firestore: Firestore = getFirebaseAdminFirestore(),
  ) {}

  createId(): string {
    return this.firestore.collection("inventory_parts").doc().id;
  }

  async findById(id: string): Promise<InventoryPart | null> {
    const snapshot = await this.firestore
      .collection("inventory_parts")
      .doc(id)
      .get();
    return snapshot.exists ? mapPart(snapshot.data() ?? {}) : null;
  }

  async findByPartNumbers(
    partNumbers: readonly string[],
  ): Promise<readonly InventoryPart[]> {
    if (partNumbers.length === 0) return [];
    const unique = [
      ...new Set(partNumbers.map((value) => value.toUpperCase())),
    ];
    const chunks = Array.from(
      { length: Math.ceil(unique.length / 30) },
      (_, index) => unique.slice(index * 30, index * 30 + 30),
    );
    const snapshots = await Promise.all(
      chunks.map((chunk) =>
        this.firestore
          .collection("inventory_parts")
          .where("partNumber", "in", chunk)
          .get(),
      ),
    );
    return snapshots.flatMap((snapshot) =>
      snapshot.docs.map((document) => mapPart(document.data())),
    );
  }

  async listParts(): Promise<readonly InventoryPart[]> {
    const snapshot = await this.firestore
      .collection("inventory_parts")
      .orderBy("partNumber", "asc")
      .limit(500)
      .get();
    return snapshot.docs.map((document) => mapPart(document.data()));
  }

  async listMovements(limit: number): Promise<readonly InventoryMovement[]> {
    const snapshot = await this.firestore
      .collection("inventory_movements")
      .orderBy("occurredAt", "desc")
      .limit(limit)
      .get();
    return snapshot.docs.map((document) => mapMovement(document.data()));
  }

  async savePart(
    part: InventoryPart,
    expectedVersion: number | null,
  ): Promise<void> {
    const ref = this.firestore.collection("inventory_parts").doc(part.id);
    await this.firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      const duplicateQuery = this.firestore
        .collection("inventory_parts")
        .where("partNumber", "==", part.partNumber)
        .limit(2);
      const duplicates = await transaction.get(duplicateQuery);
      if (duplicates.docs.some((document) => document.id !== part.id)) {
        throw new InventoryError(
          "PART_NUMBER_CONFLICT",
          "Part number is already in use.",
        );
      }
      if (expectedVersion === null) {
        if (current.exists) {
          throw new InventoryError(
            "PART_NUMBER_CONFLICT",
            "Part already exists.",
          );
        }
        transaction.create(ref, serializePart(part));
      } else {
        if (!current.exists) {
          throw new InventoryError("PART_NOT_FOUND", "Part was not found.");
        }
        if (current.get("version") !== expectedVersion) {
          throw new InventoryError(
            "PART_VERSION_CONFLICT",
            "Part has changed.",
          );
        }
        transaction.set(ref, serializePart(part));
      }
    });
  }

  async commitMovement(
    part: InventoryPart,
    movement: InventoryMovement,
    expectedVersion: number,
  ): Promise<void> {
    const partRef = this.firestore.collection("inventory_parts").doc(part.id);
    const movementRef = this.firestore
      .collection("inventory_movements")
      .doc(movement.id);
    await this.firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(partRef);
      if (!current.exists) {
        throw new InventoryError("PART_NOT_FOUND", "Part was not found.");
      }
      if (current.get("version") !== expectedVersion) {
        throw new InventoryError("PART_VERSION_CONFLICT", "Part has changed.");
      }
      transaction.set(partRef, serializePart(part));
      transaction.create(movementRef, {
        ...movement,
        occurredAt: Timestamp.fromDate(movement.occurredAt),
      });
    });
  }
}
