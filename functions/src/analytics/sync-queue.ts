import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

import { getFunctionsAdminApp } from "../config/firebase-admin.js";

async function stage(
  table:
    | "asset_events"
    | "repair_history"
    | "pm_history"
    | "inventory_movements",
  sourceId: string,
  payload: Record<string, unknown>,
) {
  await getFirestore(getFunctionsAdminApp())
    .collection("analytics_sync_queue")
    .doc(`${table}_${sourceId}`)
    .set(
      {
        table,
        sourceId,
        payload,
        status: "pending",
        attempts: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
}

export const stageAssetEvent = onDocumentCreated(
  "asset_events/{eventId}",
  async (event) => {
    const data = event.data?.data();
    if (data) await stage("asset_events", event.params.eventId, data);
  },
);

export const stageInventoryMovement = onDocumentCreated(
  "inventory_movements/{movementId}",
  async (event) => {
    const data = event.data?.data();
    if (data) {
      await stage("inventory_movements", event.params.movementId, data);
    }
  },
);

export const stageRepairHistory = onDocumentUpdated(
  "repair_tickets/{repairId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (before?.status !== "completed" && after?.status === "completed") {
      await stage("repair_history", event.params.repairId, after);
    }
  },
);

export const stagePmHistory = onDocumentUpdated(
  "pm_jobs/{pmId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (before?.status !== "completed" && after?.status === "completed") {
      await stage("pm_history", event.params.pmId, after);
    }
  },
);
