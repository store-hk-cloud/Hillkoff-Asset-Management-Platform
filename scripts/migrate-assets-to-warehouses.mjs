import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

if (getApps().length === 0) {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ?? "aasset-management-platform";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  initializeApp({
    ...(projectId ? { projectId } : {}),
    credential:
      projectId && clientEmail && privateKey
        ? cert({ projectId, clientEmail, privateKey })
        : applicationDefault(),
  });
}

const firestore = getFirestore();
const applyChanges = process.env.APPLY_WAREHOUSE_MIGRATION === "true";
const targetSerials = new Set(["0020569B", "0020571B"]);
const warehouse = {
  id: "HK1",
  name: "Hillkoff 1",
};

const snapshot = await firestore.collection("assets").get();
const matches = snapshot.docs.filter((document) => {
  const serial = String(document.get("serialNumber") ?? "")
    .trim()
    .toUpperCase();
  return targetSerials.has(serial);
});

if (matches.length !== targetSerials.size) {
  throw new Error(
    `Expected ${targetSerials.size} assets but found ${matches.length}. No changes were applied.`,
  );
}

const changes = matches.map((document) => ({
  id: document.id,
  serialNumber: document.get("serialNumber"),
  before: {
    branchId: document.get("branchId") ?? null,
    warehouseId: document.get("warehouseId") ?? null,
    locationName: document.get("locationName") ?? "",
  },
  after: {
    branchId: warehouse.id,
    warehouseId: warehouse.id,
    locationName: warehouse.name,
  },
}));

if (applyChanges) {
  const batch = firestore.batch();
  for (const match of matches) {
    const now = Timestamp.now();
    const previous = {
      branchId: match.get("branchId") ?? null,
      warehouseId: match.get("warehouseId") ?? null,
      locationName: match.get("locationName") ?? "",
    };
    const fieldChanges = {
      branchId: { before: previous.branchId, after: warehouse.id },
      warehouseId: { before: previous.warehouseId, after: warehouse.id },
      locationName: { before: previous.locationName, after: warehouse.name },
    };
    batch.update(match.ref, {
      branchId: warehouse.id,
      warehouseId: warehouse.id,
      locationName: warehouse.name,
      color: typeof match.get("color") === "string" ? match.get("color") : "",
      updatedAt: now,
      version: Number(match.get("version") ?? 0) + 1,
    });
    const eventRef = firestore.collection("asset_events").doc();
    batch.create(eventRef, {
      id: eventRef.id,
      assetId: match.id,
      type: "updated",
      title: "Asset warehouse migrated",
      description: `${match.get("assetCode")} moved to ${warehouse.id}`,
      changes: fieldChanges,
      actorId: "system-migration",
      actorDisplayName: "Warehouse migration",
      actorRole: "admin",
      occurredAt: now,
      correlationId: `warehouse-migration-${match.id}`,
    });
    const auditRef = firestore.collection("audit_logs").doc();
    batch.create(auditRef, {
      id: auditRef.id,
      action: "asset.warehouse_migrated",
      entityType: "asset",
      entityId: match.id,
      actorId: "system-migration",
      actorDisplayName: "Warehouse migration",
      actorRole: "admin",
      changes: fieldChanges,
      occurredAt: now,
      correlationId: `warehouse-migration-${match.id}`,
      ipAddress: null,
      userAgent: "migration-script",
    });
  }
  await batch.commit();
}

console.log(
  JSON.stringify(
    {
      mode: applyChanges ? "apply" : "dry-run",
      warehouse,
      changes,
    },
    null,
    2,
  ),
);

if (!applyChanges) {
  console.log(
    "No data was changed. Set APPLY_WAREHOUSE_MIGRATION=true to apply.",
  );
}
