import type { UserId } from "@/domain/value-objects/user-id";

export const TECHNICIAN_WORK_TYPES = ["repair", "pm", "installation"] as const;
export const TECHNICIAN_ASSIGNMENT_STATUSES = [
  "pending",
  "accepted",
  "rejected",
] as const;

export type TechnicianWorkType = (typeof TECHNICIAN_WORK_TYPES)[number];
export type TechnicianAssignmentStatus =
  (typeof TECHNICIAN_ASSIGNMENT_STATUSES)[number];

export interface TechnicianSummary {
  readonly id: UserId;
  readonly displayName: string;
  readonly email: string;
  readonly status: "invited" | "active" | "disabled";
}

export interface TechnicianWorkItem {
  readonly id: string;
  readonly type: TechnicianWorkType;
  readonly number: string;
  readonly title: string;
  readonly assetId: string;
  readonly assetCode: string;
  readonly assetName: string;
  readonly scheduledAt: Date;
  readonly workStatus: string;
  readonly assignmentStatus: TechnicianAssignmentStatus;
  readonly assignedTechnicianId: UserId;
  readonly assignedTechnicianName: string;
  readonly rejectionReason: string | null;
  readonly href: string;
  readonly completedAt: Date | null;
  readonly overdue: boolean;
  readonly version: number;
}

export interface TechnicianWorkspace {
  readonly newCount: number;
  readonly inProgressCount: number;
  readonly overdueCount: number;
  readonly today: readonly TechnicianWorkItem[];
  readonly active: readonly TechnicianWorkItem[];
  readonly history: readonly TechnicianWorkItem[];
}
