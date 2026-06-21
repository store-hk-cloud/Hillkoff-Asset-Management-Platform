import "server-only";

import type { Asset } from "@/domain/entities/asset";
import type { AssetEvent, AssetEventType } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  MovementLog,
  MovementType,
  SellAssetInput,
  TransferAssetInput,
} from "@/domain/entities/movement-log";
import type { UserProfile } from "@/domain/entities/user-profile";
import { WarehouseError } from "@/domain/errors/warehouse.error";
import type { WarehouseCommit } from "@/domain/repositories/warehouse.repository";
import { WarehouseMovementService } from "@/domain/services/warehouse-movement.service";
import { FirestoreAssetRepository } from "@/repositories/firestore/firestore-asset.repository";
import { FirestoreWarehouseRepository } from "@/repositories/firestore/firestore-warehouse.repository";

export interface WarehouseRequestContext {
  readonly actor: UserProfile;
  readonly correlationId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

const WAREHOUSE_READ_ROLES = [
  "admin",
  "warehouse",
  "executive",
  "branch",
] as const;
const STOCK_ROLES = ["admin", "warehouse"] as const;
const SALE_ROLES = ["admin", "warehouse", "sales"] as const;

export class WarehouseManagementService {
  constructor(
    private readonly warehouseRepository = new FirestoreWarehouseRepository(),
    private readonly assetRepository = new FirestoreAssetRepository(),
    private readonly movementService = new WarehouseMovementService(),
  ) {}

  canView(profile: UserProfile): boolean {
    return WAREHOUSE_READ_ROLES.some((role) => role === profile.role);
  }

  canTransfer(profile: UserProfile): boolean {
    return (
      STOCK_ROLES.some((role) => role === profile.role) ||
      (profile.role === "branch" && Boolean(profile.warehouseId))
    );
  }

  canSell(profile: UserProfile): boolean {
    return SALE_ROLES.some((role) => role === profile.role);
  }

  async findAssetByCode(
    assetCode: string,
    profile: UserProfile,
  ): Promise<Asset> {
    if (!this.canView(profile) && profile.role !== "sales") {
      throw new WarehouseError(
        "WAREHOUSE_ACCESS_DENIED",
        "You do not have access to warehouse operations.",
      );
    }
    const asset = await this.assetRepository.findByReference(assetCode);
    if (!asset) {
      throw new WarehouseError("ASSET_NOT_FOUND", "Asset was not found.");
    }
    if (
      profile.role === "branch" &&
      (!profile.warehouseId || asset.warehouseId !== profile.warehouseId)
    ) {
      throw new WarehouseError(
        "WAREHOUSE_ACCESS_DENIED",
        "The asset is outside your warehouse.",
      );
    }
    return asset;
  }

  async transfer(
    input: TransferAssetInput,
    context: WarehouseRequestContext,
  ): Promise<MovementLog> {
    this.requirePermission(this.canTransfer(context.actor));
    const current = await this.findAssetByCode(input.assetCode, context.actor);
    const now = new Date();
    const transition = this.movementService.transfer(
      current,
      input,
      context.actor.uid,
      now,
    );
    return this.commit(
      "warehouse_movement",
      "warehouse_moved",
      "Asset moved between warehouses",
      current,
      transition,
      input.referenceNumber,
      input.notes,
      context,
      now,
    );
  }

  async sell(
    input: SellAssetInput,
    context: WarehouseRequestContext,
  ): Promise<MovementLog> {
    this.requirePermission(this.canSell(context.actor));
    const current = await this.findAssetByCode(input.assetCode, context.actor);
    const now = new Date();
    const transition = this.movementService.sell(
      current,
      input,
      context.actor.uid,
      now,
    );
    return this.commit(
      "customer_sale",
      "customer_sold",
      "Asset sold to customer",
      current,
      transition,
      input.referenceNumber,
      input.notes,
      context,
      now,
    );
  }

  async listMovements(
    profile: UserProfile,
    type: MovementType | "all",
  ): Promise<readonly MovementLog[]> {
    if (!this.canView(profile)) {
      throw new WarehouseError(
        "WAREHOUSE_ACCESS_DENIED",
        "You do not have access to movement history.",
      );
    }
    return this.warehouseRepository.listMovements({
      type,
      warehouseId: profile.role === "branch" ? profile.warehouseId : null,
      limit: 100,
    });
  }

  private requirePermission(allowed: boolean): void {
    if (!allowed) {
      throw new WarehouseError(
        "WAREHOUSE_ACCESS_DENIED",
        "You do not have permission for this warehouse action.",
      );
    }
  }

  private async commit(
    movementType: MovementType,
    eventType: AssetEventType,
    title: string,
    current: Asset,
    transition: ReturnType<WarehouseMovementService["transfer"]>,
    referenceNumber: string | null,
    notes: string,
    context: WarehouseRequestContext,
    occurredAt: Date,
  ): Promise<MovementLog> {
    const movementId = crypto.randomUUID();
    const movement: MovementLog = {
      id: movementId,
      movementNumber: `MOV-${occurredAt
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14)}-${movementId.slice(0, 6).toUpperCase()}`,
      type: movementType,
      assetId: transition.asset.id,
      assetCode: transition.asset.assetCode,
      assetName: transition.asset.name,
      source: transition.source,
      destination: transition.destination,
      referenceNumber: referenceNumber?.trim() || null,
      notes: notes.trim(),
      occurredAt,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      correlationId: context.correlationId,
    };
    const assetEvent: AssetEvent = {
      id: crypto.randomUUID(),
      assetId: transition.asset.id,
      type: eventType,
      title,
      description: `${title}: ${transition.asset.assetCode} - ${transition.asset.name}`,
      changes: transition.changes,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      occurredAt,
      correlationId: context.correlationId,
    };
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      action: `warehouse.${movementType}`,
      entityType: "asset",
      entityId: transition.asset.id,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      changes: {
        asset: transition.changes,
        movementId,
        referenceNumber: movement.referenceNumber,
      },
      occurredAt,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };
    const commit: WarehouseCommit = {
      asset: transition.asset,
      movement,
      assetEvent,
      auditLog,
      expectedVersion: current.version,
    };
    await this.warehouseRepository.commitMovement(commit);
    return movement;
  }
}
