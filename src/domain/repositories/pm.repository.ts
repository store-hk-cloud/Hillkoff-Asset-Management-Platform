import type { AssetEvent } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type { PmJob } from "@/domain/entities/pm-job";
import type { UserId } from "@/domain/value-objects/user-id";

export interface PmCompletionCommit {
  readonly job: PmJob;
  readonly assetEvent: AssetEvent;
  readonly auditLog: AuditLog;
  readonly expectedVersion: number;
}

export interface PmRepository {
  createId(): string;
  findById(id: string): Promise<PmJob | null>;
  list(criteria: {
    technicianId: UserId | null;
    branchId: string | null;
    customerId: string | null;
    status: "scheduled" | "completed" | "all";
    from: Date | null;
    to: Date | null;
    limit: number;
  }): Promise<readonly PmJob[]>;
  schedule(job: PmJob, auditLog: AuditLog): Promise<void>;
  complete(commit: PmCompletionCommit): Promise<void>;
}
