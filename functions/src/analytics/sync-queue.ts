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
  { document: "asset_events/{eventId}", retry: true },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    try {
      await stage("asset_events", event.params.eventId, data);
    } catch (error) {
      console.error(`Failed to stage asset event ${event.params.eventId}:`, error);
      throw error;
    }
  },
);

export const stageInventoryMovement = onDocumentCreated(
  { document: "inventory_movements/{movementId}", retry: true },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    try {
      await stage("inventory_movements", event.params.movementId, data);
    } catch (error) {
      console.error(
        `Failed to stage inventory movement ${event.params.movementId}:`,
        error,
      );
      throw error;
    }
  },
);

export const stageRepairHistory = onDocumentUpdated(
  { document: "repair_tickets/{repairId}", retry: true },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (before?.status === "completed" || after?.status !== "completed") {
      return;
    }
    try {
      await stage("repair_history", event.params.repairId, after);
    } catch (error) {
      console.error(
        `Failed to stage repair history ${event.params.repairId}:`,
        error,
      );
      throw error;
    }
  },
);

export const stagePmHistory = onDocumentUpdated(
  { document: "pm_jobs/{pmId}", retry: true },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (before?.status === "completed" || after?.status !== "completed") {
      return;
    }
    try {
      await stage("pm_history", event.params.pmId, after);
    } catch (error) {
      console.error(`Failed to stage PM history ${event.params.pmId}:`, error);
      throw error;
    }
  },
);
