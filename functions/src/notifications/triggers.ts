import { onDocumentUpdated } from "firebase-functions/v2/firestore";

import { enqueueNotification } from "./queue.js";

export const enqueueRepairNotification = onDocumentUpdated(
  "repair_tickets/{repairId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.status === after.status) return;
    await enqueueNotification({
      type: "repair",
      recipientUserIds:
        typeof after.assignedTechnicianId === "string"
          ? [after.assignedTechnicianId]
          : [],
      title: `Repair ${after.ticketNumber}`,
      body: `Status changed from ${before.status} to ${after.status}`,
      entityType: "repair",
      entityId: event.params.repairId,
    });
  },
);

export const enqueuePmNotification = onDocumentUpdated(
  "pm_jobs/{pmId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (
      !before ||
      !after ||
      before.status === after.status ||
      after.status !== "completed"
    ) {
      return;
    }
    await enqueueNotification({
      type: "pm",
      recipientUserIds:
        typeof after.assignedTechnicianId === "string"
          ? [after.assignedTechnicianId]
          : [],
      title: `PM completed: ${after.jobNumber}`,
      body: `${after.assetCode} preventive maintenance was completed.`,
      entityType: "pm",
      entityId: event.params.pmId,
    });
  },
);

export const enqueueLowStockNotification = onDocumentUpdated(
  "inventory_parts/{partId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    const wasLow = before.quantityOnHand <= before.reorderPoint;
    const isLow = after.quantityOnHand <= after.reorderPoint;
    if (wasLow || !isLow) return;
    await enqueueNotification({
      type: "system",
      recipientUserIds: [],
      title: `Low stock: ${after.partNumber}`,
      body: `${after.name} has ${after.quantityOnHand} ${after.unit} remaining.`,
      entityType: "inventory",
      entityId: event.params.partId,
    });
  },
);
