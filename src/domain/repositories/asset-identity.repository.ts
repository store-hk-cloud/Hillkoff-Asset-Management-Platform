import type { Asset } from "@/domain/entities/asset";
import type { AssetEvent } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type { NfcRegistration } from "@/domain/entities/nfc-registration";
import type { AssetId } from "@/domain/value-objects/asset-id";

export interface AssetIdentityCommit {
  readonly asset: Asset;
  readonly registration: NfcRegistration;
  readonly event: AssetEvent;
  readonly auditLog: AuditLog;
  readonly expectedVersion: number;
  readonly createRegistration: boolean;
}

export interface AssetIdentityRepository {
  findLatestRegistration(assetId: AssetId): Promise<NfcRegistration | null>;
  commit(commit: AssetIdentityCommit): Promise<void>;
}
