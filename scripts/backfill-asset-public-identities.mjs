import { randomBytes, randomUUID } from "node:crypto";

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldPath, getFirestore, Timestamp } from "firebase-admin/firestore";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const actorId = process.env.IDENTITY_MIGRATION_ACTOR_UID;

if (!appUrl || !actorId) {
  throw new Error(
    "NEXT_PUBLIC_APP_URL and IDENTITY_MIGRATION_ACTOR_UID are required.",
  );
}

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault() });
}

const firestore = getFirestore();
let lastDocument = null;
let backfilled = 0;

while (true) {
  let query = firestore
    .collection("assets")
    .orderBy(FieldPath.documentId())
    .limit(200);
  if (lastDocument) query = query.startAfter(lastDocument);
  const snapshot = await query.get();
  if (snapshot.empty) break;

  for (const document of snapshot.docs.filter(
    (item) => !item.get("publicId"),
  )) {
    await firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(document.ref);
      if (!current.exists || current.get("publicId")) return;

      const publicId = randomBytes(16).toString("base64url");
      const publicUrl = new URL(`/app/a/${publicId}`, appUrl).toString();
      const collision = await transaction.get(
        firestore
          .collection("assets")
          .where("publicId", "==", publicId)
          .limit(1),
      );
      if (!collision.empty)
        throw new Error("Public ID collision; rerun migration.");

      const now = Timestamp.now();
      const correlationId = randomUUID();
      const version = Number(current.get("version") ?? 0) + 1;
      transaction.update(document.ref, {
        publicId,
        nfcUrl: publicUrl,
        qrUrl: publicUrl,
        nfcStatus: "unregistered",
        nfcTagType: null,
        nfcRegisteredAt: null,
        nfcVerifiedAt: null,
        updatedAt: now,
        updatedBy: actorId,
        version,
      });
      const eventReference = firestore.collection("asset_events").doc();
      const auditReference = firestore.collection("audit_logs").doc();
      transaction.create(eventReference, {
        id: eventReference.id,
        assetId: document.id,
        type: "public_identity_created",
        title: "Public identity created",
        description: `Public identity created for ${current.get("assetCode")}`,
        changes: { publicId: { before: null, after: publicId } },
        actorId,
        actorDisplayName: "Identity migration",
        actorRole: "admin",
        occurredAt: now,
        correlationId,
      });
      transaction.create(auditReference, {
        id: auditReference.id,
        action: "asset_identity.backfill",
        entityType: "asset",
        entityId: document.id,
        actorId,
        actorDisplayName: "Identity migration",
        actorRole: "admin",
        changes: { publicId: { before: null, after: publicId } },
        occurredAt: now,
        correlationId,
        ipAddress: null,
        userAgent: "migration-script",
      });
    });
    backfilled += 1;
  }

  lastDocument = snapshot.docs.at(-1);
}

console.log(`Backfilled ${backfilled} asset identities.`);
