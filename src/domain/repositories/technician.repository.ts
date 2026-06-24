import type { AssetEvent } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  TechnicianAssignmentStatus,
  TechnicianWorkItem,
  TechnicianWorkType,
} from "@/domain/entities/technician-work";
import type { UserId } from "@/domain/value-objects/user-id";

export interface TechnicianAssignmentUpdate {
  readonly workType: TechnicianWorkType;
  readonly workId: string;
  readonly expectedVersion: number;
  readonly technicianId: UserId;
  readonly technicianName: string;
  readonly assignmentStatus: TechnicianAssignmentStatus;
  readonly respondedAt: Date | null;
  readonly rejectionReason: string | null;
  readonly resetRepairStatus: boolean;
  readonly auditLog: AuditLog;
  readonly assetEvent: AssetEvent;
}

export interface TechnicianRepository {
  listWork(
    technicianId: UserId,
    limit: number,
  ): Promise<readonly TechnicianWorkItem[]>;
  findWork(
    type: TechnicianWorkType,
    id: string,
  ): Promise<TechnicianWorkItem | null>;
  findWorkByAsset(
    technicianId: UserId,
    assetId: string,
  ): Promise<readonly TechnicianWorkItem[]>;
  updateAssignment(update: TechnicianAssignmentUpdate): Promise<void>;
}
