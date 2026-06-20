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
const categoryByName = new Map([
  ["เครื่องชง", "coffee_machine"],
  ["coffee machine", "coffee_machine"],
  ["เครื่องบด", "grinder"],
  ["grinder", "grinder"],
  ["เครื่องปั่น", "blender"],
  ["blender", "blender"],
  ["เครื่องสี", "milling_machine"],
  ["milling machine", "milling_machine"],
  ["เครื่องคั่ว", "roaster"],
  ["roaster", "roaster"],
]);
const branchAliases = new Map([
  ["ช้างเผือก", { id: "HK1", name: "ช้างเผือก" }],
  ["chang-phueak", { id: "HK1", name: "ช้างเผือก" }],
  ["hk1", { id: "HK1", name: "ช้างเผือก" }],
  ["ป่าแพ่ง", { id: "Pa-Pang", name: "ป่าแพ่ง" }],
  ["pa-paeng", { id: "Pa-Pang", name: "ป่าแพ่ง" }],
  ["pa-pang", { id: "Pa-Pang", name: "ป่าแพ่ง" }],
  ["สำนักงานใหญ่", { id: "HQ", name: "สำนักงานใหญ่" }],
  ["head-office", { id: "HQ", name: "สำนักงานใหญ่" }],
  ["hq", { id: "HQ", name: "สำนักงานใหญ่" }],
  ["มหิดล", { id: "MHD", name: "มหิดล" }],
  ["mahidol", { id: "MHD", name: "มหิดล" }],
  ["mhd", { id: "MHD", name: "มหิดล" }],
  ["ทับเดื่อ", { id: "TD", name: "ทับเดื่อ" }],
  ["thap-duea", { id: "TD", name: "ทับเดื่อ" }],
  ["td", { id: "TD", name: "ทับเดื่อ" }],
  ["ราติก้า", { id: "Ratika", name: "ราติก้า" }],
  ["ratika", { id: "Ratika", name: "ราติก้า" }],
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
  const prefixes = keywords.flatMap((keyword) => {
    const values = [];
    for (let length = 2; length <= keyword.length; length += 1) {
      values.push(keyword.slice(0, length));
    }
    return values;
  });
  return [...new Set([...keywords, ...prefixes])].slice(0, 200);
}
let lastDocument = null;
let inspected = 0;
let preparedWrites = 0;
let normalizedUsers = 0;
let normalizedMovements = 0;

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
    const category = String(data.category ?? "").trim();
    const categoryKey =
      categoryByName.get(normalize(category)) ??
      (data.categoryKey === "coffee_machine" ||
      data.categoryKey === "grinder" ||
      data.categoryKey === "blender" ||
      data.categoryKey === "milling_machine" ||
      data.categoryKey === "roaster"
        ? data.categoryKey
        : "other");
    const branch =
      branchAliases.get(normalize(data.branchId)) ??
      branchAliases.get(normalize(data.locationName)) ??
      null;
    const branchId = branch?.id ?? data.branchId ?? null;
    const locationName = branch?.name ?? String(data.locationName ?? "").trim();
    const searchableValues = [
      assetCode,
      data.name,
      category,
      serialNumber,
      locationName,
    ];

    if (!assetCode) continue;

    batch.set(
      firestore.collection("asset_catalog").doc(encodeURIComponent(assetCode)),
      {
        assetCode,
        name: String(data.name ?? "").trim(),
        description: String(data.description ?? "").trim(),
        category,
        categoryKey,
        ...(data.custodyType === "branch" || !data.customerId
          ? {
              defaultBranchId:
                typeof branchId === "string" && branchId.trim()
                  ? branchId
                  : null,
              defaultLocationName: locationName,
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

    batch.update(document.ref, {
      categoryKey,
      branchId,
      locationName,
      searchKeywords: buildKeywords(searchableValues),
      searchPrefixes: buildPrefixes(searchableValues),
      activeTransferId:
        typeof data.activeTransferId === "string"
          ? data.activeTransferId
          : null,
      ...(serialNumber ? { normalizedSerialNumber: serialNumber } : {}),
    });
    preparedWrites += 1;

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

  if (applyChanges) {
    await batch.commit();
  }

  lastDocument = snapshot.docs.at(-1);
}

for (const collectionName of ["users", "movement_logs"]) {
  lastDocument = null;

  while (true) {
    let query = firestore
      .collection(collectionName)
      .orderBy(FieldPath.documentId())
      .limit(150);
    if (lastDocument) query = query.startAfter(lastDocument);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    const batch = firestore.batch();

    for (const document of snapshot.docs) {
      const data = document.data();

      if (collectionName === "users") {
        const branch = branchAliases.get(normalize(data.branchId));
        if (data.role === "branch" && branch && data.branchId !== branch.id) {
          batch.update(document.ref, { branchId: branch.id });
          normalizedUsers += 1;
        }
        continue;
      }

      const source = data.source ?? {};
      const destination = data.destination ?? {};
      const sourceBranch =
        branchAliases.get(normalize(source.branchId)) ??
        branchAliases.get(normalize(source.locationName));
      const destinationBranch =
        branchAliases.get(normalize(destination.branchId)) ??
        branchAliases.get(normalize(destination.locationName));
      const involvedBranchIds = [
        sourceBranch?.id ??
          (typeof source.branchId === "string" ? source.branchId : null),
        destinationBranch?.id ??
          (typeof destination.branchId === "string"
            ? destination.branchId
            : null),
      ].filter(Boolean);

      if (sourceBranch || destinationBranch) {
        batch.update(document.ref, {
          source: {
            ...source,
            ...(sourceBranch
              ? {
                  branchId: sourceBranch.id,
                  locationName: sourceBranch.name,
                }
              : {}),
          },
          destination: {
            ...destination,
            ...(destinationBranch
              ? {
                  branchId: destinationBranch.id,
                  locationName: destinationBranch.name,
                }
              : {}),
          },
          involvedBranchIds: [...new Set(involvedBranchIds)],
        });
        normalizedMovements += 1;
      }
    }

    if (applyChanges) {
      await batch.commit();
    }
    lastDocument = snapshot.docs.at(-1);
  }
}

console.log(
  JSON.stringify(
    {
      mode: applyChanges ? "apply" : "dry-run",
      inspected,
      preparedWrites,
      normalizedUsers,
      normalizedMovements,
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
