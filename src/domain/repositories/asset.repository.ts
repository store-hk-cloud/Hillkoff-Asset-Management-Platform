import type {
  Asset,
  AssetCatalog,
  AssetCategoryCounts,
  AssetSearchCriteria,
} from "@/domain/entities/asset";
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
  findByReference(reference: string): Promise<Asset | null>;
  findByPublicId(publicId: PublicId): Promise<Asset | null>;
  findCatalogByCode(assetCode: string): Promise<AssetCatalog | null>;
  countInStockByCode(assetCode: string): Promise<number>;
  countByCategory(
    criteria: Pick<AssetSearchCriteria, "status" | "branchId" | "customerId">,
  ): Promise<AssetCategoryCounts>;
  search(criteria: AssetSearchCriteria): Promise<readonly Asset[]>;
  listEvents(
    assetId: AssetId,
    types?: readonly AssetEventType[],
  ): Promise<readonly AssetEvent[]>;
  commit(commit: AssetCommit): Promise<void>;
}
