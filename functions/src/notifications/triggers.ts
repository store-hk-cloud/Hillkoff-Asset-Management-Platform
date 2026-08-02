import { onDocumentUpdated } from "firebase-functions/v2/firestore";

import { enqueueNotification } from "./queue.js";

export const enqueueRepairNotification = onDocumentUpdated(
  { document: "repair_tickets/{repairId}", retry: true },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (
      !before ||
      !after ||
      (before.status === after.status &&
        before.assignedTechnicianId === after.assignedTechnicianId)
    ) {
      return;
    }
    try {
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
    } catch (error) {
      console.error(
        `Failed to enqueue repair notification ${event.params.repairId}:`,
        error,
      );
      throw error;
    }
  },
);

export const enqueuePmNotification = onDocumentUpdated(
  { document: "pm_jobs/{pmId}", retry: true },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    try {
      const assignmentChanged =
        before.assignedTechnicianId !== after.assignedTechnicianId ||
        (before.assignmentStatus !== "pending" &&
          after.assignmentStatus === "pending");
      if (
        assignmentChanged &&
        typeof after.assignedTechnicianId === "string"
      ) {
        await enqueueNotification({
          type: "pm",
          recipientUserIds: [after.assignedTechnicianId],
          title: `New PM assignment: ${after.jobNumber}`,
          body: `${after.assetCode} is scheduled for preventive maintenance.`,
          entityType: "pm",
          entityId: event.params.pmId,
        });
      }
      if (before.status === after.status || after.status !== "completed") {
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
    } catch (error) {
      console.error(
        `Failed to enqueue PM notification ${event.params.pmId}:`,
        error,
      );
      throw error;
    }
  },
);

export const enqueueInstallationUpdateNotification = onDocumentUpdated(
  { document: "installations/{installationId}", retry: true },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    const assignmentChanged =
      before.assignedTechnicianId !== after.assignedTechnicianId ||
      (before.assignmentStatus !== "pending" &&
        after.assignmentStatus === "pending");
    if (!assignmentChanged || typeof after.assignedTechnicianId !== "string") {
      return;
    }
    try {
      await enqueueNotification({
        type: "system",
        recipientUserIds: [after.assignedTechnicianId],
        title: `New installation: ${after.installationNumber}`,
        body: `${after.assetCode} installation was assigned to you.`,
        entityType: "system",
        entityId: event.params.installationId,
      });
    } catch (error) {
      console.error(
        `Failed to enqueue installation notification ${event.params.installationId}:`,
        error,
      );
      throw error;
    }
  },
);

export const enqueueLowStockNotification = onDocumentUpdated(
  { document: "inventory_parts/{partId}", retry: true },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    const wasLow = before.quantityOnHand <= before.reorderPoint;
    const isLow = after.quantityOnHand <= after.reorderPoint;
    // Only notify when stock newly drops below threshold, or decreases further while already low
    const droppedBelow = !wasLow && isLow;
    const decreasedFurther =
      wasLow && after.quantityOnHand < before.quantityOnHand;
    if (!droppedBelow && !decreasedFurther) return;
    try {
      await enqueueNotification({
        type: "system",
        // Empty recipients — visible to admin/executive via unfiltered queue view
        recipientUserIds: [],
        title: `Low stock: ${after.partNumber}`,
        body: `${after.name} has ${after.quantityOnHand} ${after.unit} remaining (reorder point: ${after.reorderPoint}).`,
        entityType: "inventory",
        entityId: event.params.partId,
      });
    } catch (error) {
      console.error(
        `Failed to enqueue low-stock notification ${event.params.partId}:`,
        error,
      );
      throw error;
    }
  },
);
