import type { AssetId } from "@/domain/value-objects/asset-id";
import type { UserId } from "@/domain/value-objects/user-id";
import type { TechnicianAssignmentStatus } from "@/domain/entities/technician-work";

export const PM_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type PmStatus = (typeof PM_STATUSES)[number];

export interface PmChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly required: boolean;
  readonly completed: boolean;
  readonly notes: string;
}

export interface PmJob {
  readonly id: string;
  readonly jobNumber: string;
  readonly assetId: AssetId;
  readonly assetCode: string;
  readonly assetName: string;
  readonly warehouseId: string | null;
  readonly customerId: string | null;
  readonly title: string;
  readonly scheduledAt: Date;
  readonly assignedTechnicianId: UserId;
  readonly assignedTechnicianName: string;
  readonly assignmentStatus: TechnicianAssignmentStatus;
  readonly assignmentRespondedAt: Date | null;
  readonly assignmentRejectionReason: string | null;
  readonly status: PmStatus;
  readonly checklist: readonly PmChecklistItem[];
  readonly completionNotes: string;
  readonly recurrenceMonths: number | null;
  readonly nextDueAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly createdBy: UserId;
  readonly updatedAt: Date;
  readonly updatedBy: UserId;
  readonly version: number;
}

export interface SchedulePmInput {
  readonly assetCode: string;
  readonly title: string;
  readonly scheduledAt: Date;
  readonly assignedTechnicianId: UserId;
  readonly assignedTechnicianName: string;
  readonly checklistLabels: readonly string[];
  readonly recurrenceMonths: number | null;
}

export interface CompletePmInput {
  readonly expectedVersion: number;
  readonly checklist: readonly PmChecklistItem[];
  readonly completionNotes: string;
}
