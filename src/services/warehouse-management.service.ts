import "server-only";

import type { Asset } from "@/domain/entities/asset";
import type { AssetEvent, AssetEventType } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  MovementLog,
  MovementType,
  ReceiveAssetInput,
  SellAssetInput,
  TransferAssetInput,
} from "@/domain/entities/movement-log";
import type { UserProfile } from "@/domain/entities/user-profile";
import type {
  AssetTransfer,
  AssetTransferStatus,
  ReceiveAssetTransferInput,
  RejectAssetTransferInput,
} from "@/domain/entities/asset-transfer";
import { WarehouseError } from "@/domain/errors/warehouse.error";
import type { WarehouseCommit } from "@/domain/repositories/warehouse.repository";
import { WarehouseMovementService } from "@/domain/services/warehouse-movement.service";
import {
  AssetTransferService,
  type AssetTransferTransition,
} from "@/domain/services/asset-transfer.service";
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
    private readonly transferService = new AssetTransferService(),
  ) {}

  canView(profile: UserProfile): boolean {
    return WAREHOUSE_READ_ROLES.some((role) => role === profile.role);
  }

  canReceive(profile: UserProfile): boolean {
    return STOCK_ROLES.some((role) => role === profile.role);
  }

  canTransfer(profile: UserProfile): boolean {
    return (
      STOCK_ROLES.some((role) => role === profile.role) ||
      (profile.role === "branch" && Boolean(profile.branchId))
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
      (!profile.branchId || asset.branchId !== profile.branchId)
    ) {
      throw new WarehouseError(
        "WAREHOUSE_ACCESS_DENIED",
        "The asset is outside your branch.",
      );
    }

    return asset;
  }

  async receive(
    input: ReceiveAssetInput,
    context: WarehouseRequestContext,
  ): Promise<MovementLog> {
    this.requirePermission(this.canReceive(context.actor));
    const current = await this.findAssetByCode(input.assetCode, context.actor);
    const now = new Date();
    const transition = this.movementService.receive(
      current,
      input,
      context.actor.uid,
      now,
    );
    return this.commit(
      "received",
      "warehouse_received",
      "Asset received",
      current,
      transition,
      input.referenceNumber,
      input.notes,
      context,
      now,
    );
  }

  async transfer(
    input: TransferAssetInput,
    context: WarehouseRequestContext,
  ): Promise<AssetTransfer> {
    this.requirePermission(this.canTransfer(context.actor));
    const current = await this.findAssetByCode(input.assetCode, context.actor);
    if (
      context.actor.role === "branch" &&
      current.branchId !== context.actor.branchId
    ) {
      throw new WarehouseError(
        "WAREHOUSE_ACCESS_DENIED",
        "A branch can transfer only its own stock.",
      );
    }
    const now = new Date();
    const transition = this.transferService.request(
      crypto.randomUUID(),
      current,
      input,
      context.actor.uid,
      now,
    );
    await this.commitTransfer(
      current,
      transition,
      "transfer_requested",
      "Asset transfer requested",
      context,
      now,
      null,
      null,
    );
    return transition.transfer;
  }

  async listTransfers(
    profile: UserProfile,
    status: AssetTransferStatus | "open" | "all",
  ): Promise<readonly AssetTransfer[]> {
    if (!this.canView(profile)) {
      throw new WarehouseError(
        "WAREHOUSE_ACCESS_DENIED",
        "You do not have access to asset transfers.",
      );
    }
    return this.warehouseRepository.listTransfers({
      status,
      branchId: profile.role === "branch" ? profile.branchId : null,
      limit: 100,
    });
  }

  async dispatchTransfer(
    id: string,
    expectedVersion: number,
    context: WarehouseRequestContext,
  ): Promise<AssetTransfer> {
    const { transfer, asset } = await this.getTransferContext(id);
    this.requireSourcePermission(context.actor, transfer);
    const now = new Date();
    const transition = this.transferService.dispatch(
      asset,
      transfer,
      expectedVersion,
      context.actor.uid,
      now,
    );
    await this.commitTransfer(
      asset,
      transition,
      "transfer_dispatched",
      "Asset dispatched",
      context,
      now,
      transfer.version,
      null,
    );
    return transition.transfer;
  }

  async receiveTransfer(
    id: string,
    input: ReceiveAssetTransferInput,
    context: WarehouseRequestContext,
  ): Promise<AssetTransfer> {
    const { transfer, asset } = await this.getTransferContext(id);
    this.requireDestinationPermission(context.actor, transfer);
    const verificationReference = input.verificationReference.trim();
    const validReferences = [
      asset.id,
      asset.serialNumber,
      asset.publicId,
      asset.nfcUrl,
      asset.qrUrl,
    ].filter((value): value is string => Boolean(value));
    if (!validReferences.some((value) => value === verificationReference)) {
      throw new WarehouseError(
        "INVALID_MOVEMENT",
        "Scanned asset identity does not match this transfer.",
      );
    }
    const now = new Date();
    const transition = this.transferService.receive(
      asset,
      transfer,
      input.expectedVersion,
      context.actor.uid,
      now,
    );
    await this.commitTransfer(
      asset,
      transition,
      "transfer_received",
      "Asset received by destination branch",
      context,
      now,
      transfer.version,
      this.createTransferMovement(transition, context, now),
    );
    return transition.transfer;
  }

  async cancelTransfer(
    id: string,
    expectedVersion: number,
    context: WarehouseRequestContext,
  ): Promise<AssetTransfer> {
    const { transfer, asset } = await this.getTransferContext(id);
    this.requireSourcePermission(context.actor, transfer);
    const now = new Date();
    const transition = this.transferService.cancel(
      asset,
      transfer,
      expectedVersion,
      context.actor.uid,
      now,
    );
    await this.commitTransfer(
      asset,
      transition,
      "transfer_cancelled",
      "Asset transfer cancelled",
      context,
      now,
      transfer.version,
      null,
    );
    return transition.transfer;
  }

  async rejectTransfer(
    id: string,
    input: RejectAssetTransferInput,
    context: WarehouseRequestContext,
  ): Promise<AssetTransfer> {
    const { transfer, asset } = await this.getTransferContext(id);
    this.requireDestinationPermission(context.actor, transfer);
    const now = new Date();
    const transition = this.transferService.reject(
      asset,
      transfer,
      input,
      context.actor.uid,
      now,
    );
    await this.commitTransfer(
      asset,
      transition,
      "transfer_rejected",
      "Asset transfer rejected",
      context,
      now,
      transfer.version,
      null,
    );
    return transition.transfer;
  }

  async returnTransferToSource(
    id: string,
    expectedVersion: number,
    context: WarehouseRequestContext,
  ): Promise<AssetTransfer> {
    const { transfer, asset } = await this.getTransferContext(id);
    this.requireSourcePermission(context.actor, transfer);
    const now = new Date();
    const transition = this.transferService.returnToSource(
      asset,
      transfer,
      expectedVersion,
      context.actor.uid,
      now,
    );
    await this.commitTransfer(
      asset,
      transition,
      "transfer_returned",
      "Returned asset received by source branch",
      context,
      now,
      transfer.version,
      null,
    );
    return transition.transfer;
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
      branchId: profile.role === "branch" ? profile.branchId : null,
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

  private async getTransferContext(id: string) {
    const transfer = await this.warehouseRepository.findTransferById(id);
    if (!transfer) {
      throw new WarehouseError("TRANSFER_NOT_FOUND", "Transfer was not found.");
    }
    const asset = await this.assetRepository.findById(transfer.assetId);
    if (!asset) {
      throw new WarehouseError("ASSET_NOT_FOUND", "Asset was not found.");
    }
    return { transfer, asset };
  }

  private requireSourcePermission(
    profile: UserProfile,
    transfer: AssetTransfer,
  ): void {
    this.requirePermission(
      STOCK_ROLES.some((role) => role === profile.role) ||
        (profile.role === "branch" &&
          profile.branchId === transfer.sourceBranchId),
    );
  }

  private requireDestinationPermission(
    profile: UserProfile,
    transfer: AssetTransfer,
  ): void {
    this.requirePermission(
      STOCK_ROLES.some((role) => role === profile.role) ||
        (profile.role === "branch" &&
          profile.branchId === transfer.destinationBranchId),
    );
  }

  private createTransferMovement(
    transition: AssetTransferTransition,
    context: WarehouseRequestContext,
    occurredAt: Date,
  ): MovementLog {
    const movementId = crypto.randomUUID();
    return {
      id: movementId,
      movementNumber: `MOV-${occurredAt
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14)}-${movementId.slice(0, 6).toUpperCase()}`,
      type: "branch_transfer",
      assetId: transition.asset.id,
      assetCode: transition.asset.assetCode,
      assetName: transition.asset.name,
      source: {
        type: "branch",
        name: transition.transfer.sourceLocationName,
        externalType: null,
        branchId: transition.transfer.sourceBranchId,
        customerId: null,
        locationName: transition.transfer.sourceLocationName,
      },
      destination: {
        type: "branch",
        name: transition.transfer.destinationLocationName,
        externalType: null,
        branchId: transition.transfer.destinationBranchId,
        customerId: null,
        locationName: transition.transfer.destinationLocationName,
      },
      referenceNumber: transition.transfer.referenceNumber,
      notes: transition.transfer.notes,
      occurredAt,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      correlationId: context.correlationId,
    };
  }

  private async commitTransfer(
    current: Asset,
    transition: AssetTransferTransition,
    eventType: AssetEventType,
    title: string,
    context: WarehouseRequestContext,
    occurredAt: Date,
    expectedTransferVersion: number | null,
    movement: MovementLog | null,
  ): Promise<void> {
    const assetEvent: AssetEvent = {
      id: crypto.randomUUID(),
      assetId: current.id,
      type: eventType,
      title,
      description: `${title}: ${current.assetCode} - ${current.name}`,
      changes: transition.changes,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      occurredAt,
      correlationId: context.correlationId,
    };
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      action: `warehouse.${eventType}`,
      entityType: "asset_transfer",
      entityId: transition.transfer.id,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      changes: {
        asset: transition.changes,
        transferStatus: {
          before:
            expectedTransferVersion === null ? null : expectedTransferVersion,
          after: transition.transfer.status,
        },
      },
      occurredAt,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };
    await this.warehouseRepository.commitTransfer({
      asset: transition.asset,
      transfer: transition.transfer,
      assetEvent,
      auditLog,
      movement,
      expectedAssetVersion: current.version,
      expectedTransferVersion,
    });
  }

  private async commit(
    movementType: MovementType,
    eventType: AssetEventType,
    title: string,
    current: Asset,
    transition: ReturnType<WarehouseMovementService["receive"]>,
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
