import "server-only";

import {
  Timestamp,
  type DocumentData,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";

import type {
  Asset,
  AssetCatalog,
  AssetCategoryCounts,
  AssetCondition,
  AssetCustodyType,
  AssetDocument,
  AssetSearchCriteria,
  AssetStatus,
} from "@/domain/entities/asset";
import {
  ASSET_CATEGORY_KEYS,
  inferAssetCategoryKey,
  isAssetCategoryKey,
} from "@/domain/master-data/asset-categories";
import type {
  AssetEvent,
  AssetEventType,
  AssetFieldChange,
} from "@/domain/entities/asset-event";
import type {
  AssetCommit,
  AssetRepository,
} from "@/domain/repositories/asset.repository";
import { AssetError } from "@/domain/errors/asset.error";
import { createAssetId, type AssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";
import {
  createPublicId,
  type PublicId,
} from "@/domain/value-objects/public-id";
import { isUserRole } from "@/domain/value-objects/user-role";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

function requireString(data: DocumentData, field: string): string {
  const value = data[field];

  if (typeof value !== "string") {
    throw new Error(`Invalid asset field: ${field}.`);
  }

  return value;
}

function nullableString(data: DocumentData, field: string): string | null {
  const value = data[field];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Invalid asset field: ${field}.`);
  }

  return value;
}

function normalizeAssetCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeSerialNumber(value: string): string {
  return value.trim().toUpperCase();
}

function assetCatalogId(assetCode: string): string {
  return encodeURIComponent(normalizeAssetCode(assetCode));
}

function serialRegistryId(serialNumber: string): string {
  return encodeURIComponent(normalizeSerialNumber(serialNumber));
}

function requireTimestamp(data: DocumentData, field: string): Date {
  const value = data[field];

  if (!(value instanceof Timestamp)) {
    throw new Error(`Invalid asset timestamp: ${field}.`);
  }

  return value.toDate();
}

function nullableTimestamp(data: DocumentData, field: string): Date | null {
  const value = data[field];

  if (value === null) {
    return null;
  }

  if (!(value instanceof Timestamp)) {
    throw new Error(`Invalid asset timestamp: ${field}.`);
  }

  return value.toDate();
}

function isAssetStatus(value: unknown): value is AssetStatus {
  return value === "active" || value === "archived";
}

function isAssetCondition(value: unknown): value is AssetCondition {
  return (
    value === "operational" ||
    value === "needs_repair" ||
    value === "out_of_service"
  );
}

function isAssetCustodyType(value: unknown): value is AssetCustodyType {
  return value === "branch" || value === "customer" || value === "in_transit";
}

function mapDocumentMetadata(data: DocumentData): AssetDocument {
  return {
    id: requireString(data, "id"),
    name: requireString(data, "name"),
    storagePath: requireString(data, "storagePath"),
    contentType: requireString(data, "contentType"),
    size: Number(data.size),
    uploadedAt: requireTimestamp(data, "uploadedAt"),
    uploadedBy: createUserId(requireString(data, "uploadedBy")),
  };
}

function mapAsset(data: DocumentData): Asset {
  const status = data.status;
  const condition = data.condition;
  const inferredCustodyType =
    data.customerId !== null && data.customerId !== undefined
      ? "customer"
      : "branch";
  const custodyType = isAssetCustodyType(data.custodyType)
    ? data.custodyType
    : inferredCustodyType;
  const version = data.version;

  if (!isAssetStatus(status) || !isAssetCondition(condition)) {
    throw new Error("Invalid asset status or condition.");
  }

  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error("Invalid asset version.");
  }

  return {
    id: createAssetId(requireString(data, "id")),
    publicId:
      typeof data.publicId === "string" ? createPublicId(data.publicId) : null,
    nfcUrl: typeof data.nfcUrl === "string" ? data.nfcUrl : null,
    qrUrl: typeof data.qrUrl === "string" ? data.qrUrl : null,
    assetCode: requireString(data, "assetCode"),
    name: requireString(data, "name"),
    description: requireString(data, "description"),
    category: requireString(data, "category"),
    categoryKey: isAssetCategoryKey(data.categoryKey)
      ? data.categoryKey
      : inferAssetCategoryKey(requireString(data, "category")),
    serialNumber: nullableString(data, "serialNumber"),
    condition,
    status,
    custodyType,
    branchId: nullableString(data, "branchId"),
    customerId: nullableString(data, "customerId"),
    locationName: requireString(data, "locationName"),
    installedAt: nullableTimestamp(data, "installedAt"),
    installationLatitude:
      typeof data.installationLatitude === "number"
        ? data.installationLatitude
        : null,
    installationLongitude:
      typeof data.installationLongitude === "number"
        ? data.installationLongitude
        : null,
    lastMovementAt:
      data.lastMovementAt === undefined
        ? null
        : nullableTimestamp(data, "lastMovementAt"),
    activeTransferId:
      typeof data.activeTransferId === "string" ? data.activeTransferId : null,
    nfcStatus:
      data.nfcStatus === "registered" ||
      data.nfcStatus === "verified" ||
      data.nfcStatus === "mismatch" ||
      data.nfcStatus === "revoked"
        ? data.nfcStatus
        : "unregistered",
    nfcTagType:
      data.nfcTagType === "ntag213" || data.nfcTagType === "ntag215"
        ? data.nfcTagType
        : null,
    nfcRegisteredAt:
      data.nfcRegisteredAt === undefined
        ? null
        : nullableTimestamp(data, "nfcRegisteredAt"),
    nfcVerifiedAt:
      data.nfcVerifiedAt === undefined
        ? null
        : nullableTimestamp(data, "nfcVerifiedAt"),
    warranty: {
      status:
        data.warranty?.status === "active" ||
        data.warranty?.status === "expired"
          ? data.warranty.status
          : "inactive",
      startedAt:
        data.warranty?.startedAt instanceof Timestamp
          ? data.warranty.startedAt.toDate()
          : null,
      expiresAt:
        data.warranty?.expiresAt instanceof Timestamp
          ? data.warranty.expiresAt.toDate()
          : null,
      installationId:
        typeof data.warranty?.installationId === "string"
          ? data.warranty.installationId
          : null,
    },
    documents: Array.isArray(data.documents)
      ? data.documents.map((document) => mapDocumentMetadata(document))
      : [],
    searchKeywords: Array.isArray(data.searchKeywords)
      ? data.searchKeywords.filter(
          (keyword): keyword is string => typeof keyword === "string",
        )
      : [],
    searchPrefixes: Array.isArray(data.searchPrefixes)
      ? data.searchPrefixes.filter(
          (prefix): prefix is string => typeof prefix === "string",
        )
      : Array.isArray(data.searchKeywords)
        ? data.searchKeywords.filter(
            (keyword): keyword is string => typeof keyword === "string",
          )
        : [],
    version,
    createdAt: requireTimestamp(data, "createdAt"),
    createdBy: createUserId(requireString(data, "createdBy")),
    updatedAt: requireTimestamp(data, "updatedAt"),
    updatedBy: createUserId(requireString(data, "updatedBy")),
    archivedAt: nullableTimestamp(data, "archivedAt"),
    archivedBy: data.archivedBy
      ? createUserId(requireString(data, "archivedBy"))
      : null,
  };
}

function mapAssetEvent(data: DocumentData): AssetEvent {
  const type = data.type as AssetEventType;
  const actorRole = data.actorRole;

  if (!isUserRole(actorRole)) {
    throw new Error("Invalid asset event actor role.");
  }

  return {
    id: requireString(data, "id"),
    assetId: createAssetId(requireString(data, "assetId")),
    type,
    title: requireString(data, "title"),
    description: requireString(data, "description"),
    changes: (data.changes ?? {}) as Readonly<Record<string, AssetFieldChange>>,
    actorId: createUserId(requireString(data, "actorId")),
    actorDisplayName: requireString(data, "actorDisplayName"),
    actorRole,
    occurredAt: requireTimestamp(data, "occurredAt"),
    correlationId: requireString(data, "correlationId"),
  };
}

function serializeAsset(asset: Asset): DocumentData {
  return {
    ...asset,
    id: asset.id,
    normalizedSerialNumber: asset.serialNumber
      ? normalizeSerialNumber(asset.serialNumber)
      : null,
    installedAt: asset.installedAt
      ? Timestamp.fromDate(asset.installedAt)
      : null,
    lastMovementAt: asset.lastMovementAt
      ? Timestamp.fromDate(asset.lastMovementAt)
      : null,
    nfcRegisteredAt: asset.nfcRegisteredAt
      ? Timestamp.fromDate(asset.nfcRegisteredAt)
      : null,
    nfcVerifiedAt: asset.nfcVerifiedAt
      ? Timestamp.fromDate(asset.nfcVerifiedAt)
      : null,
    warranty: {
      ...asset.warranty,
      startedAt: asset.warranty.startedAt
        ? Timestamp.fromDate(asset.warranty.startedAt)
        : null,
      expiresAt: asset.warranty.expiresAt
        ? Timestamp.fromDate(asset.warranty.expiresAt)
        : null,
    },
    documents: asset.documents.map((document) => ({
      ...document,
      uploadedAt: Timestamp.fromDate(document.uploadedAt),
    })),
    createdAt: Timestamp.fromDate(asset.createdAt),
    updatedAt: Timestamp.fromDate(asset.updatedAt),
    archivedAt: asset.archivedAt ? Timestamp.fromDate(asset.archivedAt) : null,
  };
}

function serializeEvent(event: AssetEvent): DocumentData {
  return {
    ...event,
    occurredAt: Timestamp.fromDate(event.occurredAt),
  };
}

function serializeAuditLog(commit: AssetCommit): DocumentData {
  return {
    ...commit.auditLog,
    occurredAt: Timestamp.fromDate(commit.auditLog.occurredAt),
  };
}

export class FirestoreAssetRepository implements AssetRepository {
  constructor(
    private readonly firestore: Firestore = getFirebaseAdminFirestore(),
  ) {}

  createId(): AssetId {
    return createAssetId(this.firestore.collection("assets").doc().id);
  }

  async findById(id: AssetId): Promise<Asset | null> {
    const snapshot = await this.firestore.collection("assets").doc(id).get();
    return snapshot.exists ? mapAsset(snapshot.data() ?? {}) : null;
  }

  async findByCode(assetCode: string): Promise<Asset | null> {
    const snapshot = await this.firestore
      .collection("assets")
      .where("assetCode", "==", normalizeAssetCode(assetCode))
      .limit(2)
      .get();

    if (snapshot.size > 1) {
      throw new AssetError(
        "ASSET_REFERENCE_AMBIGUOUS",
        "More than one machine uses this asset code. Enter the serial number or scan its QR/NFC tag.",
      );
    }

    const document = snapshot.docs[0];
    return document ? mapAsset(document.data()) : null;
  }

  async findByReference(reference: string): Promise<Asset | null> {
    const normalized = reference.trim();

    if (!normalized) {
      return null;
    }

    try {
      const url = new URL(normalized);
      const match = url.pathname.match(/^\/app\/a\/([^/]+)\/?$/);
      const publicId = match?.[1];
      if (publicId) {
        return this.findByPublicId(createPublicId(publicId));
      }
    } catch {
      // Not a URL; continue with Asset ID, serial number, and Asset Code.
    }

    const direct = await this.findById(createAssetId(normalized));
    if (direct) {
      return direct;
    }

    const normalizedSerial = normalizeSerialNumber(normalized);
    const normalizedSerialSnapshot = await this.firestore
      .collection("assets")
      .where("normalizedSerialNumber", "==", normalizedSerial)
      .limit(2)
      .get();
    const serialSnapshot = normalizedSerialSnapshot.empty
      ? await this.firestore
          .collection("assets")
          .where("serialNumber", "in", [
            ...new Set([normalizedSerial, normalized]),
          ])
          .limit(2)
          .get()
      : normalizedSerialSnapshot;

    if (serialSnapshot.size > 1) {
      throw new AssetError(
        "ASSET_SERIAL_CONFLICT",
        "Duplicate serial numbers exist. Contact an administrator before continuing.",
      );
    }

    const serialDocument = serialSnapshot.docs[0];
    if (serialDocument) {
      return mapAsset(serialDocument.data());
    }

    return this.findByCode(normalized);
  }

  async findByPublicId(publicId: PublicId): Promise<Asset | null> {
    const snapshot = await this.firestore
      .collection("assets")
      .where("publicId", "==", publicId)
      .limit(1)
      .get();
    const document = snapshot.docs[0];
    return document ? mapAsset(document.data()) : null;
  }

  async findCatalogByCode(assetCode: string): Promise<AssetCatalog | null> {
    const normalizedCode = normalizeAssetCode(assetCode);
    const catalogSnapshot = await this.firestore
      .collection("asset_catalog")
      .doc(assetCatalogId(normalizedCode))
      .get();

    if (catalogSnapshot.exists) {
      const data = catalogSnapshot.data() ?? {};
      return {
        assetCode: requireString(data, "assetCode"),
        name: requireString(data, "name"),
        description: requireString(data, "description"),
        category: requireString(data, "category"),
        categoryKey: isAssetCategoryKey(data.categoryKey)
          ? data.categoryKey
          : inferAssetCategoryKey(requireString(data, "category")),
        defaultBranchId:
          typeof data.defaultBranchId === "string"
            ? data.defaultBranchId
            : null,
        defaultLocationName:
          typeof data.defaultLocationName === "string"
            ? data.defaultLocationName
            : "",
        updatedAt: requireTimestamp(data, "updatedAt"),
      };
    }

    const assetSnapshot = await this.firestore
      .collection("assets")
      .where("assetCode", "==", normalizedCode)
      .limit(1)
      .get();
    const document = assetSnapshot.docs[0];

    if (!document) {
      return null;
    }

    const asset = mapAsset(document.data());
    return {
      assetCode: asset.assetCode,
      name: asset.name,
      description: asset.description,
      category: asset.category,
      categoryKey: asset.categoryKey,
      defaultBranchId: asset.branchId,
      defaultLocationName: asset.locationName,
      updatedAt: asset.updatedAt,
    };
  }

  async countInStockByCode(assetCode: string): Promise<number> {
    const snapshot = await this.firestore
      .collection("assets")
      .where("assetCode", "==", normalizeAssetCode(assetCode))
      .where("status", "==", "active")
      .get();
    return snapshot.docs
      .map((document) => mapAsset(document.data()))
      .filter((asset) => asset.custodyType === "branch").length;
  }

  async countByCategory(
    criteria: Pick<AssetSearchCriteria, "status" | "branchId" | "customerId">,
  ): Promise<AssetCategoryCounts> {
    const entries = await Promise.all(
      ASSET_CATEGORY_KEYS.map(async (categoryKey) => {
        let query: Query = this.firestore.collection("assets");

        if (criteria.status !== "all") {
          query = query.where("status", "==", criteria.status);
        }
        if (criteria.branchId) {
          query = query.where("branchId", "==", criteria.branchId);
        }
        if (criteria.customerId) {
          query = query.where("customerId", "==", criteria.customerId);
        }

        const snapshot = await query
          .where("categoryKey", "==", categoryKey)
          .count()
          .get();
        return [categoryKey, snapshot.data().count] as const;
      }),
    );

    return Object.fromEntries(entries) as AssetCategoryCounts;
  }

  async search(criteria: AssetSearchCriteria): Promise<readonly Asset[]> {
    let query: Query = this.firestore.collection("assets");
    const firstKeyword = criteria.query
      .trim()
      .toLocaleLowerCase("th-TH")
      .split(/\s+/)[0];

    if (criteria.status !== "all") {
      query = query.where("status", "==", criteria.status);
    }

    if (criteria.branchId) {
      query = query.where("branchId", "==", criteria.branchId);
    }

    if (criteria.customerId) {
      query = query.where("customerId", "==", criteria.customerId);
    }

    if (criteria.categoryKey !== "all") {
      query = query.where("categoryKey", "==", criteria.categoryKey);
    }

    if (firstKeyword) {
      query = query.where(
        firstKeyword.length >= 2 ? "searchPrefixes" : "searchKeywords",
        "array-contains",
        firstKeyword,
      );
    }

    const snapshot = await query
      .orderBy("updatedAt", "desc")
      .limit(criteria.limit)
      .get();
    const queryKeywords = criteria.query
      .trim()
      .toLocaleLowerCase("th-TH")
      .split(/\s+/)
      .filter(Boolean);

    return snapshot.docs
      .map((document) => mapAsset(document.data()))
      .filter((asset) =>
        queryKeywords.every((keyword) =>
          asset.searchPrefixes.includes(keyword),
        ),
      );
  }

  async listEvents(
    assetId: AssetId,
    types?: readonly AssetEventType[],
  ): Promise<readonly AssetEvent[]> {
    let query: Query = this.firestore
      .collection("asset_events")
      .where("assetId", "==", assetId);

    if (types?.length) {
      query = query.where("type", "in", types);
    }

    const snapshot = await query.orderBy("occurredAt", "desc").limit(100).get();
    return snapshot.docs.map((document) => mapAssetEvent(document.data()));
  }

  async commit(commit: AssetCommit): Promise<void> {
    const assetReference = this.firestore
      .collection("assets")
      .doc(commit.asset.id);
    const eventReference = this.firestore
      .collection("asset_events")
      .doc(commit.event.id);
    const auditReference = this.firestore
      .collection("audit_logs")
      .doc(commit.auditLog.id);
    const serialReference = commit.asset.serialNumber
      ? this.firestore
          .collection("asset_serials")
          .doc(serialRegistryId(commit.asset.serialNumber))
      : null;
    const catalogReference = this.firestore
      .collection("asset_catalog")
      .doc(assetCatalogId(commit.asset.assetCode));

    await this.firestore.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(assetReference);
      const currentAsset = currentSnapshot.exists
        ? mapAsset(currentSnapshot.data() ?? {})
        : null;
      const currentSerialReference =
        currentAsset?.serialNumber &&
        normalizeSerialNumber(currentAsset.serialNumber) !==
          normalizeSerialNumber(commit.asset.serialNumber ?? "")
          ? this.firestore
              .collection("asset_serials")
              .doc(serialRegistryId(currentAsset.serialNumber))
          : null;
      const serialSnapshot = serialReference
        ? await transaction.get(serialReference)
        : null;
      const currentSerialSnapshot = currentSerialReference
        ? await transaction.get(currentSerialReference)
        : null;
      const serialQuery = commit.asset.serialNumber
        ? this.firestore
            .collection("assets")
            .where(
              "normalizedSerialNumber",
              "==",
              normalizeSerialNumber(commit.asset.serialNumber),
            )
            .limit(2)
        : null;
      const duplicateSerialSnapshot = serialQuery
        ? await transaction.get(serialQuery)
        : null;
      const legacySerialQuery = commit.asset.serialNumber
        ? this.firestore
            .collection("assets")
            .where(
              "serialNumber",
              "==",
              normalizeSerialNumber(commit.asset.serialNumber),
            )
            .limit(2)
        : null;
      const legacyDuplicateSerialSnapshot = legacySerialQuery
        ? await transaction.get(legacySerialQuery)
        : null;
      const publicIdQuery = commit.asset.publicId
        ? this.firestore
            .collection("assets")
            .where("publicId", "==", commit.asset.publicId)
            .limit(2)
        : null;
      const publicIdSnapshot = publicIdQuery
        ? await transaction.get(publicIdQuery)
        : null;
      const conflictingSerial =
        (serialSnapshot?.exists &&
          serialSnapshot.get("assetId") !== commit.asset.id) ||
        duplicateSerialSnapshot?.docs.some(
          (document) => document.id !== commit.asset.id,
        ) ||
        legacyDuplicateSerialSnapshot?.docs.some(
          (document) => document.id !== commit.asset.id,
        ) ||
        false;

      if (conflictingSerial) {
        throw new AssetError(
          "ASSET_SERIAL_CONFLICT",
          "This serial number is already in use.",
        );
      }

      if (
        publicIdSnapshot?.docs.some(
          (document) => document.id !== commit.asset.id,
        )
      ) {
        throw new AssetError(
          "ASSET_CODE_CONFLICT",
          "This public identity is already in use.",
        );
      }

      if (commit.expectedVersion === null) {
        if (currentSnapshot.exists) {
          throw new AssetError(
            "ASSET_CODE_CONFLICT",
            "The asset already exists.",
          );
        }

        transaction.create(assetReference, serializeAsset(commit.asset));
      } else {
        if (!currentSnapshot.exists) {
          throw new AssetError("ASSET_NOT_FOUND", "Asset was not found.");
        }

        if (!currentAsset || currentAsset.version !== commit.expectedVersion) {
          throw new AssetError(
            "ASSET_VERSION_CONFLICT",
            "The asset has changed. Reload and try again.",
          );
        }

        transaction.set(assetReference, serializeAsset(commit.asset));
      }

      if (currentSerialReference) {
        if (
          currentSerialSnapshot?.exists &&
          currentSerialSnapshot.get("assetId") === commit.asset.id
        ) {
          transaction.delete(currentSerialReference);
        }
      }

      if (serialReference && commit.asset.serialNumber) {
        transaction.set(serialReference, {
          assetId: commit.asset.id,
          serialNumber: commit.asset.serialNumber,
          normalizedSerialNumber: normalizeSerialNumber(
            commit.asset.serialNumber,
          ),
          updatedAt: Timestamp.fromDate(commit.asset.updatedAt),
        });
      }
      transaction.set(
        catalogReference,
        {
          assetCode: commit.asset.assetCode,
          name: commit.asset.name,
          description: commit.asset.description,
          category: commit.asset.category,
          categoryKey: commit.asset.categoryKey,
          ...(commit.asset.custodyType === "branch"
            ? {
                defaultBranchId: commit.asset.branchId,
                defaultLocationName: commit.asset.locationName,
              }
            : {}),
          updatedAt: Timestamp.fromDate(commit.asset.updatedAt),
        },
        { merge: true },
      );
      transaction.create(eventReference, serializeEvent(commit.event));
      transaction.create(auditReference, serializeAuditLog(commit));
    });
  }
}
