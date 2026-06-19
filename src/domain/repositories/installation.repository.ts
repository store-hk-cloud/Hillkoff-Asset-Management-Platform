import type { Asset } from "@/domain/entities/asset";
import type { AssetEvent } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type { Installation } from "@/domain/entities/installation";
import type { UserId } from "@/domain/value-objects/user-id";

export interface InstallationCompletionCommit {
  readonly installation: Installation;
  readonly asset: Asset;
  readonly event: AssetEvent;
  readonly auditLog: AuditLog;
  readonly expectedInstallationVersion: number;
  readonly expectedAssetVersion: number;
}

export interface InstallationRepository {
  createId(): string;
  findById(id: string): Promise<Installation | null>;
  listQueue(criteria: {
    technicianId: UserId | null;
    customerId: string | null;
    limit: number;
  }): Promise<readonly Installation[]>;
  schedule(installation: Installation, auditLog: AuditLog): Promise<void>;
  start(
    installation: Installation,
    auditLog: AuditLog,
    expectedVersion: number,
  ): Promise<void>;
  complete(commit: InstallationCompletionCommit): Promise<void>;
}
