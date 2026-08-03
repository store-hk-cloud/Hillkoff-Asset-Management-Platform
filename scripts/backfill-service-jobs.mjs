import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldPath, getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) initializeApp({ credential: applicationDefault() });

const applyChanges = process.argv.includes("--apply");
const checkpointIndex = process.argv.indexOf("--checkpoint");
const checkpointFile =
  checkpointIndex >= 0 ? process.argv[checkpointIndex + 1] : null;
const firestore = getFirestore();
const sources = [
  { collection: "repairs", workType: "repair" },
  { collection: "installations", workType: "installation" },
];

let inspected = 0;
let candidates = 0;
let written = 0;
let skipped = 0;
const mapping = [];

for (const source of sources) {
  let cursor = null;
  while (true) {
    let query = firestore
      .collection(source.collection)
      .orderBy(FieldPath.documentId())
      .limit(100);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    for (const document of snapshot.docs) {
      inspected += 1;
      const data = document.data();
      const targetId = `${source.workType}_${document.id}`;
      const target = firestore.collection("service_jobs").doc(targetId);
      if ((await target.get()).exists) {
        skipped += 1;
        continue;
      }
      candidates += 1;
      mapping.push({
        source: `${source.collection}/${document.id}`,
        target: `service_jobs/${targetId}`,
      });
      if (!applyChanges) continue;

      // Legacy records are intentionally migrated as closed historical jobs.
      // The source link makes the migration auditable and the deterministic ID
      // makes reruns idempotent.
      const createdAt = data.createdAt ?? new Date();
      const updatedAt = data.updatedAt ?? createdAt;
      const actorId = String(data.createdBy ?? data.updatedBy ?? "migration");
      const customerName = String(
        data.customerName ?? data.customer ?? "Legacy customer",
      );
      const phone = String(data.phone ?? data.customerPhone ?? "Not provided");
      await target.create({
        id: targetId,
        jobNumber: `MIG-${source.collection.slice(0, 3).toUpperCase()}-${document.id}`,
        schemaVersion: 1,
        legacySource: source.collection,
        legacyId: document.id,
        workType: source.workType,
        fulfillmentMode: "onsite",
        status: data.status === "completed" ? "completed" : "closed",
        title: String(
          data.title ?? data.description ?? `${source.workType} ${document.id}`,
        ),
        description: String(
          data.description ?? "Migrated from legacy work record.",
        ),
        customer: {
          customerId:
            typeof data.customerId === "string" ? data.customerId : null,
          name: customerName,
          taxId: null,
          group: null,
          billingAddress: String(data.address ?? "Not provided"),
          serviceAddress: String(data.address ?? "Not provided"),
          primaryPhone: phone,
          secondaryPhone: null,
        },
        contact: { name: customerName, phone, extension: null, email: null },
        asset: {
          assetId: typeof data.assetId === "string" ? data.assetId : null,
          assetCode: typeof data.assetCode === "string" ? data.assetCode : null,
          serialNumber:
            typeof data.serialNumber === "string" ? data.serialNumber : null,
          equipmentType: String(data.equipmentType ?? "Unknown"),
          brand: String(data.brand ?? "Unknown"),
          model: String(data.model ?? "Unknown"),
          warrantyStatus: "unknown",
          warrantyExpiresAt: null,
          repeatRepair: false,
          previousRepairNumber: null,
          includedAccessories: [],
          observedDefects: [],
          additionalRequirements: "",
        },
        assignedTechnicianIds: [],
        leadTechnicianId: null,
        evidence: [],
        rootCause: String(data.rootCause ?? ""),
        solution: String(data.solution ?? ""),
        completedAt: data.completedAt ?? null,
        approvedAssessmentId: null,
        handedOffAt: null,
        handoffSignature: null,
        handoffOverrideReason: null,
        termsAcceptedAt: createdAt,
        termsAcceptedBy: actorId,
        createdBy: actorId,
        updatedBy: actorId,
        version: 1,
        createdAt,
        updatedAt,
        execution: {
          checkIn: null,
          checkOut: null,
          checklist: [],
          partsConsumed: [],
          serviceActions: [],
          completionNotes: "",
          deliveryNotes: "",
        },
        warehouseId:
          typeof data.warehouseId === "string" ? data.warehouseId : null,
      });
      written += 1;
    }
    cursor = snapshot.docs.at(-1);
  }
}

const summary = {
  mode: applyChanges ? "apply" : "dry-run",
  inspected,
  candidates,
  written,
  skipped,
  totalReconciliation: inspected === candidates + skipped,
  mapping,
};
console.log(JSON.stringify(summary));
if (checkpointFile) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(checkpointFile, JSON.stringify(summary, null, 2));
}
