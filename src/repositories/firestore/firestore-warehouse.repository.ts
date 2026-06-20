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
import type {
  AssetTransfer,
  AssetTransferStatus,
} from "@/domain/entities/asset-transfer";
import { WarehouseError } from "@/domain/errors/warehouse.error";
import type {
  MovementSearchCriteria,
  AssetTransferCommit,
  AssetTransferSearchCriteria,
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
  const branchId = nullableString(data, "branchId");
  const customerId = nullableString(data, "customerId");
  const locationName = requireString(data, "locationName");
  return {
    type:
      data.type === "external"
        ? "external"
        : customerId
          ? "customer"
          : "branch",
    name: typeof data.name === "string" ? data.name : locationName,
    externalType:
      data.externalType === "supplier" ||
      data.externalType === "external" ||
      data.externalType === "other"
        ? data.externalType
        : null,
    branchId,
    customerId,
    locationName,
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

function nullableTransferTimestamp(
  data: DocumentData,
  field: string,
): Date | null {
  const value = data[field];
  return value instanceof Timestamp ? value.toDate() : null;
}

function isTransferStatus(value: unknown): value is AssetTransferStatus {
  return (
    value === "pending_dispatch" ||
    value === "in_transit" ||
    value === "received" ||
    value === "cancelled" ||
    value === "return_in_transit" ||
    value === "returned"
  );
}

function mapTransfer(data: DocumentData): AssetTransfer {
  if (
    !isTransferStatus(data.status) ||
    !(data.requestedAt instanceof Timestamp) ||
    !(data.updatedAt instanceof Timestamp)
  ) {
    throw new Error("Invalid asset transfer.");
  }
  return {
    id: requireString(data, "id"),
    transferNumber: requireString(data, "transferNumber"),
    assetId: createAssetId(requireString(data, "assetId")),
    assetCode: requireString(data, "assetCode"),
    assetName: requireString(data, "assetName"),
    serialNumber: nullableString(data, "serialNumber"),
    sourceBranchId: requireString(data, "sourceBranchId"),
    sourceLocationName: requireString(data, "sourceLocationName"),
    destinationBranchId: requireString(data, "destinationBranchId"),
    destinationLocationName: requireString(data, "destinationLocationName"),
    status: data.status,
    referenceNumber: nullableString(data, "referenceNumber"),
    notes: requireString(data, "notes"),
    rejectionReason: nullableString(data, "rejectionReason"),
    requestedAt: data.requestedAt.toDate(),
    requestedBy: createUserId(requireString(data, "requestedBy")),
    dispatchedAt: nullableTransferTimestamp(data, "dispatchedAt"),
    dispatchedBy: data.dispatchedBy
      ? createUserId(requireString(data, "dispatchedBy"))
      : null,
    receivedAt: nullableTransferTimestamp(data, "receivedAt"),
    receivedBy: data.receivedBy
      ? createUserId(requireString(data, "receivedBy"))
      : null,
    returnedAt: nullableTransferTimestamp(data, "returnedAt"),
    returnedBy: data.returnedBy
      ? createUserId(requireString(data, "returnedBy"))
      : null,
    closedAt: nullableTransferTimestamp(data, "closedAt"),
    closedBy: data.closedBy
      ? createUserId(requireString(data, "closedBy"))
      : null,
    updatedAt: data.updatedAt.toDate(),
    version: Number(data.version),
  };
}

function serializeTransfer(transfer: AssetTransfer): DocumentData {
  return {
    ...transfer,
    involvedBranchIds: [transfer.sourceBranchId, transfer.destinationBranchId],
    requestedAt: Timestamp.fromDate(transfer.requestedAt),
    dispatchedAt: transfer.dispatchedAt
      ? Timestamp.fromDate(transfer.dispatchedAt)
      : null,
    receivedAt: transfer.receivedAt
      ? Timestamp.fromDate(transfer.receivedAt)
      : null,
    returnedAt: transfer.returnedAt
      ? Timestamp.fromDate(transfer.returnedAt)
      : null,
    closedAt: transfer.closedAt ? Timestamp.fromDate(transfer.closedAt) : null,
    updatedAt: Timestamp.fromDate(transfer.updatedAt),
  };
}

function serializeEndpoint(endpoint: MovementEndpoint) {
  return {
    type: endpoint.type,
    name: endpoint.name,
    externalType: endpoint.externalType,
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

  async findTransferById(id: string): Promise<AssetTransfer | null> {
    const snapshot = await this.firestore
      .collection("asset_transfers")
      .doc(id)
      .get();
    return snapshot.exists ? mapTransfer(snapshot.data() ?? {}) : null;
  }

  async listTransfers(
    criteria: AssetTransferSearchCriteria,
  ): Promise<readonly AssetTransfer[]> {
    let query: Query = this.firestore.collection("asset_transfers");
    if (criteria.status === "open") {
      query = query.where("status", "in", [
        "pending_dispatch",
        "in_transit",
        "return_in_transit",
      ]);
    } else if (criteria.status !== "all") {
      query = query.where("status", "==", criteria.status);
    }
    if (criteria.branchId) {
      query = query.where(
        "involvedBranchIds",
        "array-contains",
        criteria.branchId,
      );
    }
    const snapshot = await query
      .orderBy("updatedAt", "desc")
      .limit(criteria.limit)
      .get();
    return snapshot.docs.map((document) => mapTransfer(document.data()));
  }

  async commitTransfer(commit: AssetTransferCommit): Promise<void> {
    const assetReference = this.firestore
      .collection("assets")
      .doc(commit.asset.id);
    const transferReference = this.firestore
      .collection("asset_transfers")
      .doc(commit.transfer.id);
    const eventReference = this.firestore
      .collection("asset_events")
      .doc(commit.assetEvent.id);
    const auditReference = this.firestore
      .collection("audit_logs")
      .doc(commit.auditLog.id);
    const movementReference = commit.movement
      ? this.firestore.collection("movement_logs").doc(commit.movement.id)
      : null;

    await this.firestore.runTransaction(async (transaction) => {
      const assetSnapshot = await transaction.get(assetReference);
      const transferSnapshot = await transaction.get(transferReference);
      if (!assetSnapshot.exists) {
        throw new WarehouseError("ASSET_NOT_FOUND", "Asset was not found.");
      }
      if (assetSnapshot.get("version") !== commit.expectedAssetVersion) {
        throw new WarehouseError(
          "ASSET_VERSION_CONFLICT",
          "The asset has changed. Reload and try again.",
        );
      }
      if (commit.expectedTransferVersion === null) {
        if (transferSnapshot.exists) {
          throw new WarehouseError(
            "TRANSFER_STATE_CONFLICT",
            "The transfer already exists.",
          );
        }
        transaction.create(
          transferReference,
          serializeTransfer(commit.transfer),
        );
      } else {
        if (
          !transferSnapshot.exists ||
          transferSnapshot.get("version") !== commit.expectedTransferVersion
        ) {
          throw new WarehouseError(
            "TRANSFER_VERSION_CONFLICT",
            "The transfer has changed. Reload and try again.",
          );
        }
        transaction.set(transferReference, serializeTransfer(commit.transfer));
      }

      transaction.update(assetReference, {
        custodyType: commit.asset.custodyType,
        branchId: commit.asset.branchId,
        customerId: commit.asset.customerId,
        locationName: commit.asset.locationName,
        activeTransferId: commit.asset.activeTransferId,
        searchKeywords: commit.asset.searchKeywords,
        searchPrefixes: commit.asset.searchPrefixes,
        lastMovementAt: commit.asset.lastMovementAt
          ? Timestamp.fromDate(commit.asset.lastMovementAt)
          : null,
        updatedAt: Timestamp.fromDate(commit.asset.updatedAt),
        updatedBy: commit.asset.updatedBy,
        version: commit.asset.version,
      });
      transaction.create(eventReference, {
        ...commit.assetEvent,
        occurredAt: Timestamp.fromDate(commit.assetEvent.occurredAt),
      });
      transaction.create(auditReference, {
        ...commit.auditLog,
        occurredAt: Timestamp.fromDate(commit.auditLog.occurredAt),
      });
      if (movementReference && commit.movement) {
        transaction.create(movementReference, {
          ...commit.movement,
          source: serializeEndpoint(commit.movement.source),
          destination: serializeEndpoint(commit.movement.destination),
          involvedBranchIds: [
            commit.transfer.sourceBranchId,
            commit.transfer.destinationBranchId,
          ],
          occurredAt: Timestamp.fromDate(commit.movement.occurredAt),
        });
      }
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
