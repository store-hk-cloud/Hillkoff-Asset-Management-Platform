import type { AssetEvent } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  InventoryMovement,
  InventoryPart,
} from "@/domain/entities/inventory";
import type { RepairTicket } from "@/domain/entities/repair-ticket";
import type { UserId } from "@/domain/value-objects/user-id";

export interface RepairCommit {
  readonly ticket: RepairTicket;
  readonly assetEvent: AssetEvent | null;
  readonly auditLog: AuditLog;
  readonly expectedVersion: number | null;
  readonly inventoryIssues: readonly {
    readonly part: InventoryPart;
    readonly movement: InventoryMovement;
    readonly expectedVersion: number;
  }[];
}

export interface RepairSearchCriteria {
  readonly technicianId: UserId | null;
  readonly warehouseId: string | null;
  readonly customerId: string | null;
  readonly limit: number;
}

export interface RepairRepository {
  createId(): string;
  findById(id: string): Promise<RepairTicket | null>;
  list(criteria: RepairSearchCriteria): Promise<readonly RepairTicket[]>;
  findLatestOpenByAsset(assetId: string): Promise<RepairTicket | null>;
  commit(commit: RepairCommit): Promise<void>;
}
