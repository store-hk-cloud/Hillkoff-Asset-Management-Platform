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
const validCategoryKeys = new Set([
  "coffee_machine",
  "grinder",
  "blender",
  "milling_machine",
  "roaster",
  "other",
]);

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("th-TH");
}

function buildKeywords(values) {
  return [...new Set(values.flatMap((value) => normalize(value).split(/\s+/)))]
    .filter(Boolean)
    .slice(0, 50);
}

function buildPrefixes(values) {
  const keywords = buildKeywords(values);
  return [
    ...new Set(
      keywords.flatMap((keyword) => {
        const prefixes = [keyword];
        for (let length = 2; length <= keyword.length; length += 1) {
          prefixes.push(keyword.slice(0, length));
        }
        return prefixes;
      }),
    ),
  ].slice(0, 200);
}

let cursor = null;
let inspected = 0;
let preparedWrites = 0;

while (true) {
  let query = firestore
    .collection("assets")
    .orderBy(FieldPath.documentId())
    .limit(150);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  if (snapshot.empty) break;

  const batch = firestore.batch();
  for (const document of snapshot.docs) {
    inspected += 1;
    const data = document.data();
    const assetCode = String(data.assetCode ?? "")
      .trim()
      .toUpperCase();
    if (!assetCode) continue;

    const serialNumber = String(data.serialNumber ?? "")
      .trim()
      .toUpperCase();
    const category = String(data.category ?? "").trim();
    const categoryKey = validCategoryKeys.has(data.categoryKey)
      ? data.categoryKey
      : "other";
    const warehouseId =
      typeof data.warehouseId === "string" ? data.warehouseId : null;
    const locationName = String(data.locationName ?? "").trim();
    const searchableValues = [
      assetCode,
      data.name,
      category,
      serialNumber,
      data.color,
      warehouseId,
      locationName,
    ];

    batch.set(
      firestore.collection("asset_catalog").doc(encodeURIComponent(assetCode)),
      {
        assetCode,
        name: String(data.name ?? "").trim(),
        description: String(data.description ?? "").trim(),
        category,
        categoryKey,
        defaultWarehouseId:
          data.custodyType === "customer" ? null : warehouseId,
        defaultLocationName:
          data.custodyType === "customer" ? "" : locationName,
        updatedAt:
          data.updatedAt instanceof Timestamp
            ? data.updatedAt
            : Timestamp.now(),
      },
      { merge: true },
    );
    batch.update(document.ref, {
      categoryKey,
      color: typeof data.color === "string" ? data.color : "",
      searchKeywords: buildKeywords(searchableValues),
      searchPrefixes: buildPrefixes(searchableValues),
      ...(serialNumber ? { normalizedSerialNumber: serialNumber } : {}),
    });
    preparedWrites += 2;

    if (!serialNumber) {
      missingSerials.push(document.id);
      continue;
    }

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

  if (applyChanges) await batch.commit();
  cursor = snapshot.docs.at(-1);
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
