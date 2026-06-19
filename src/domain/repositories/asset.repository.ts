import type { Asset, AssetSearchCriteria } from "@/domain/entities/asset";
import type { AssetEvent, AssetEventType } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type { AssetId } from "@/domain/value-objects/asset-id";
import type { PublicId } from "@/domain/value-objects/public-id";

export interface AssetCommit {
  readonly asset: Asset;
  readonly event: AssetEvent;
  readonly auditLog: AuditLog;
  readonly expectedVersion: number | null;
}

export interface AssetRepository {
  createId(): AssetId;
  findById(id: AssetId): Promise<Asset | null>;
  findByCode(assetCode: string): Promise<Asset | null>;
  findByPublicId(publicId: PublicId): Promise<Asset | null>;
  search(criteria: AssetSearchCriteria): Promise<readonly Asset[]>;
  listEvents(
    assetId: AssetId,
    types?: readonly AssetEventType[],
  ): Promise<readonly AssetEvent[]>;
  commit(commit: AssetCommit): Promise<void>;
}
