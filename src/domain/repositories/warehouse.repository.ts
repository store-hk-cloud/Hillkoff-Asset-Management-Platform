import type { Asset } from "@/domain/entities/asset";
import type { AssetEvent } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type { MovementLog, MovementType } from "@/domain/entities/movement-log";

export interface WarehouseCommit {
  readonly asset: Asset;
  readonly movement: MovementLog;
  readonly assetEvent: AssetEvent;
  readonly auditLog: AuditLog;
  readonly expectedVersion: number;
}

export interface MovementSearchCriteria {
  readonly type: MovementType | "all";
  readonly warehouseId: string | null;
  readonly limit: number;
}

export interface WarehouseRepository {
  commitMovement(commit: WarehouseCommit): Promise<void>;
  listMovements(
    criteria: MovementSearchCriteria,
  ): Promise<readonly MovementLog[]>;
}
