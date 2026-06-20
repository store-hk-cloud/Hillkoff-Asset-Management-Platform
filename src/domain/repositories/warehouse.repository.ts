import type { Asset } from "@/domain/entities/asset";
import type { AssetEvent } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type { MovementLog, MovementType } from "@/domain/entities/movement-log";
import type {
  AssetTransfer,
  AssetTransferStatus,
} from "@/domain/entities/asset-transfer";

export interface WarehouseCommit {
  readonly asset: Asset;
  readonly movement: MovementLog;
  readonly assetEvent: AssetEvent;
  readonly auditLog: AuditLog;
  readonly expectedVersion: number;
}

export interface AssetTransferCommit {
  readonly asset: Asset;
  readonly transfer: AssetTransfer;
  readonly assetEvent: AssetEvent;
  readonly auditLog: AuditLog;
  readonly movement: MovementLog | null;
  readonly expectedAssetVersion: number;
  readonly expectedTransferVersion: number | null;
}

export interface AssetTransferSearchCriteria {
  readonly status: AssetTransferStatus | "open" | "all";
  readonly branchId: string | null;
  readonly limit: number;
}

export interface MovementSearchCriteria {
  readonly type: MovementType | "all";
  readonly branchId: string | null;
  readonly limit: number;
}

export interface WarehouseRepository {
  commitMovement(commit: WarehouseCommit): Promise<void>;
  listMovements(
    criteria: MovementSearchCriteria,
  ): Promise<readonly MovementLog[]>;
  findTransferById(id: string): Promise<AssetTransfer | null>;
  listTransfers(
    criteria: AssetTransferSearchCriteria,
  ): Promise<readonly AssetTransfer[]>;
  commitTransfer(commit: AssetTransferCommit): Promise<void>;
}
