import type { AssetId } from "@/domain/value-objects/asset-id";
import type { UserId } from "@/domain/value-objects/user-id";

export const REPAIR_STATUSES = [
  "new",
  "assigned",
  "in_progress",
  "waiting_parts",
  "completed",
  "closed",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export interface RepairPhoto {
  readonly id: string;
  readonly name: string;
  readonly storagePath: string;
  readonly contentType: string;
  readonly size: number;
  readonly uploadedAt: Date;
  readonly uploadedBy: UserId;
}

export interface RepairPartUsed {
  readonly id: string;
  readonly partNumber: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitCost: number;
}

export interface RepairTicket {
  readonly id: string;
  readonly ticketNumber: string;
  readonly assetId: AssetId;
  readonly assetCode: string;
  readonly assetName: string;
  readonly branchId: string | null;
  readonly customerId: string | null;
  readonly title: string;
  readonly description: string;
  readonly status: RepairStatus;
  readonly assignedTechnicianId: UserId | null;
  readonly assignedTechnicianName: string | null;
  readonly photos: readonly RepairPhoto[];
  readonly rootCause: string;
  readonly solution: string;
  readonly laborCost: number;
  readonly partsUsed: readonly RepairPartUsed[];
  readonly completedAt: Date | null;
  readonly closedAt: Date | null;
  readonly createdAt: Date;
  readonly createdBy: UserId;
  readonly updatedAt: Date;
  readonly updatedBy: UserId;
  readonly version: number;
}

export interface CreateRepairTicketInput {
  readonly assetCode: string;
  readonly title: string;
  readonly description: string;
}

export interface AssignRepairTicketInput {
  readonly expectedVersion: number;
  readonly technicianId: UserId;
  readonly technicianName: string;
}

export interface UpdateRepairTicketInput {
  readonly expectedVersion: number;
  readonly targetStatus: RepairStatus | null;
  readonly photos: readonly RepairPhoto[];
  readonly rootCause: string;
  readonly solution: string;
  readonly laborCost: number;
  readonly partsUsed: readonly RepairPartUsed[];
}
