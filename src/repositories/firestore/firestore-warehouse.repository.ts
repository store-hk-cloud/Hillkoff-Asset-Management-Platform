import "server-only";

import {
  Timestamp,
  type DocumentData,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";

import type {
  MovementEndpoint,
  MovementLog,
  MovementType,
} from "@/domain/entities/movement-log";
import { WarehouseError } from "@/domain/errors/warehouse.error";
import type {
  MovementSearchCriteria,
  WarehouseCommit,
  WarehouseRepository,
} from "@/domain/repositories/warehouse.repository";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";
import { isUserRole } from "@/domain/value-objects/user-role";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

function requireString(data: DocumentData, field: string): string {
  const value = data[field];

  if (typeof value !== "string") {
    throw new Error(`Invalid movement field: ${field}.`);
  }

  return value;
}

function nullableString(data: DocumentData, field: string): string | null {
  const value = data[field];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Invalid movement field: ${field}.`);
  }

  return value;
}

function mapEndpoint(data: DocumentData): MovementEndpoint {
  return {
    branchId: nullableString(data, "branchId"),
    customerId: nullableString(data, "customerId"),
    locationName: requireString(data, "locationName"),
  };
}

function isMovementType(value: unknown): value is MovementType {
  return (
    value === "received" ||
    value === "branch_transfer" ||
    value === "customer_sale"
  );
}

function mapMovement(data: DocumentData): MovementLog {
  const type = data.type;
  const actorRole = data.actorRole;

  if (!isMovementType(type) || !isUserRole(actorRole)) {
    throw new Error("Invalid movement type or actor role.");
  }

  if (!(data.occurredAt instanceof Timestamp)) {
    throw new Error("Invalid movement occurredAt.");
  }

  return {
    id: requireString(data, "id"),
    movementNumber: requireString(data, "movementNumber"),
    type,
    assetId: createAssetId(requireString(data, "assetId")),
    assetCode: requireString(data, "assetCode"),
    assetName: requireString(data, "assetName"),
    source: mapEndpoint(data.source ?? {}),
    destination: mapEndpoint(data.destination ?? {}),
    referenceNumber: nullableString(data, "referenceNumber"),
    notes: requireString(data, "notes"),
    occurredAt: data.occurredAt.toDate(),
    actorId: createUserId(requireString(data, "actorId")),
    actorDisplayName: requireString(data, "actorDisplayName"),
    actorRole,
    correlationId: requireString(data, "correlationId"),
  };
}

function serializeEndpoint(endpoint: MovementEndpoint) {
  return {
    branchId: endpoint.branchId,
    customerId: endpoint.customerId,
    locationName: endpoint.locationName,
  };
}

export class FirestoreWarehouseRepository implements WarehouseRepository {
  constructor(
    private readonly firestore: Firestore = getFirebaseAdminFirestore(),
  ) {}

  async commitMovement(commit: WarehouseCommit): Promise<void> {
    const assetReference = this.firestore
      .collection("assets")
      .doc(commit.asset.id);
    const movementReference = this.firestore
      .collection("movement_logs")
      .doc(commit.movement.id);
    const eventReference = this.firestore
      .collection("asset_events")
      .doc(commit.assetEvent.id);
    const auditReference = this.firestore
      .collection("audit_logs")
      .doc(commit.auditLog.id);

    await this.firestore.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(assetReference);

      if (!currentSnapshot.exists) {
        throw new WarehouseError("ASSET_NOT_FOUND", "Asset was not found.");
      }

      const currentVersion = currentSnapshot.get("version");

      if (currentVersion !== commit.expectedVersion) {
        throw new WarehouseError(
          "ASSET_VERSION_CONFLICT",
          "The asset has changed. Reload and try again.",
        );
      }

      const asset = commit.asset;
      transaction.update(assetReference, {
        custodyType: asset.custodyType,
        branchId: asset.branchId,
        customerId: asset.customerId,
        locationName: asset.locationName,
        lastMovementAt: Timestamp.fromDate(
          asset.lastMovementAt ?? asset.updatedAt,
        ),
        updatedAt: Timestamp.fromDate(asset.updatedAt),
        updatedBy: asset.updatedBy,
        version: asset.version,
      });
      transaction.create(movementReference, {
        ...commit.movement,
        source: serializeEndpoint(commit.movement.source),
        destination: serializeEndpoint(commit.movement.destination),
        involvedBranchIds: [
          ...new Set(
            [
              commit.movement.source.branchId,
              commit.movement.destination.branchId,
            ].filter((branchId): branchId is string => Boolean(branchId)),
          ),
        ],
        occurredAt: Timestamp.fromDate(commit.movement.occurredAt),
      });
      transaction.create(eventReference, {
        ...commit.assetEvent,
        occurredAt: Timestamp.fromDate(commit.assetEvent.occurredAt),
      });
      transaction.create(auditReference, {
        ...commit.auditLog,
        occurredAt: Timestamp.fromDate(commit.auditLog.occurredAt),
      });
    });
  }

  async listMovements(
    criteria: MovementSearchCriteria,
  ): Promise<readonly MovementLog[]> {
    let query: Query = this.firestore.collection("movement_logs");

    if (criteria.type !== "all") {
      query = query.where("type", "==", criteria.type);
    }

    if (criteria.branchId) {
      query = query.where(
        "involvedBranchIds",
        "array-contains",
        criteria.branchId,
      );
    }

    const snapshot = await query
      .orderBy("occurredAt", "desc")
      .limit(criteria.limit)
      .get();
    return snapshot.docs.map((document) => mapMovement(document.data()));
  }
}
