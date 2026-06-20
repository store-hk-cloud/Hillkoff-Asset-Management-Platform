import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldPath, getFirestore, Timestamp } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault() });
}

const firestore = getFirestore();
const applyChanges = process.env.APPLY_ASSET_CATALOG_MIGRATION === "true";
const seenSerials = new Map();
const missingSerials = [];
const duplicateSerials = [];
let lastDocument = null;
let inspected = 0;
let preparedWrites = 0;

while (true) {
  let query = firestore
    .collection("assets")
    .orderBy(FieldPath.documentId())
    .limit(150);
  if (lastDocument) query = query.startAfter(lastDocument);
  const snapshot = await query.get();
  if (snapshot.empty) break;

  const batch = firestore.batch();

  for (const document of snapshot.docs) {
    inspected += 1;
    const data = document.data();
    const assetCode = String(data.assetCode ?? "")
      .trim()
      .toUpperCase();
    const serialNumber = String(data.serialNumber ?? "")
      .trim()
      .toUpperCase();

    if (!assetCode) continue;

    batch.set(
      firestore.collection("asset_catalog").doc(encodeURIComponent(assetCode)),
      {
        assetCode,
        name: String(data.name ?? "").trim(),
        description: String(data.description ?? "").trim(),
        category: String(data.category ?? "").trim(),
        ...(data.custodyType === "branch" || !data.customerId
          ? {
              defaultBranchId:
                typeof data.branchId === "string" && data.branchId.trim()
                  ? data.branchId.trim()
                  : null,
              defaultLocationName: String(data.locationName ?? "").trim(),
            }
          : {}),
        updatedAt:
          data.updatedAt instanceof Timestamp
            ? data.updatedAt
            : Timestamp.now(),
      },
      { merge: true },
    );
    preparedWrites += 1;

    if (!serialNumber) {
      missingSerials.push(document.id);
      continue;
    }

    batch.update(document.ref, { normalizedSerialNumber: serialNumber });
    preparedWrites += 1;

    const existingAssetId = seenSerials.get(serialNumber);
    if (existingAssetId) {
      duplicateSerials.push({
        serialNumber,
        assetIds: [existingAssetId, document.id],
      });
      continue;
    }
    seenSerials.set(serialNumber, document.id);

    batch.set(
      firestore
        .collection("asset_serials")
        .doc(encodeURIComponent(serialNumber)),
      {
        assetId: document.id,
        serialNumber,
        normalizedSerialNumber: serialNumber,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    preparedWrites += 1;
  }

  if (applyChanges) {
    await batch.commit();
  }

  lastDocument = snapshot.docs.at(-1);
}

console.log(
  JSON.stringify(
    {
      mode: applyChanges ? "apply" : "dry-run",
      inspected,
      preparedWrites,
      missingSerialAssetIds: missingSerials,
      duplicateSerials,
    },
    null,
    2,
  ),
);

if (!applyChanges) {
  console.log(
    "No data was changed. Set APPLY_ASSET_CATALOG_MIGRATION=true to apply.",
  );
}
