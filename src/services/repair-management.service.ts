import "server-only";

import type { AssetEvent } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  AssignRepairTicketInput,
  CreateRepairTicketInput,
  RepairTicket,
  UpdateRepairTicketInput,
} from "@/domain/entities/repair-ticket";
import type { UserProfile } from "@/domain/entities/user-profile";
import { RepairError } from "@/domain/errors/repair.error";
import type { RepairCommit } from "@/domain/repositories/repair.repository";
import { AssetAccessService } from "@/domain/services/asset-access.service";
import { InventoryDomainService } from "@/domain/services/inventory-domain.service";
import { RepairDomainService } from "@/domain/services/repair-domain.service";
import { FirestoreAssetRepository } from "@/repositories/firestore/firestore-asset.repository";
import { FirestoreInventoryRepository } from "@/repositories/firestore/firestore-inventory.repository";
import { FirestoreRepairRepository } from "@/repositories/firestore/firestore-repair.repository";
import { FirestoreUserRepository } from "@/repositories/firestore/firestore-user.repository";

export interface RepairRequestContext {
  readonly actor: UserProfile;
  readonly correlationId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

const REPAIR_READ_ROLES = [
  "admin",
  "warehouse",
  "technician",
  "sales",
  "branch",
  "customer",
  "executive",
] as const;
const REPAIR_CREATE_ROLES = [
  "admin",
  "warehouse",
  "technician",
  "sales",
  "branch",
  "customer",
] as const;

export class RepairManagementService {
  constructor(
    private readonly repository = new FirestoreRepairRepository(),
    private readonly assetRepository = new FirestoreAssetRepository(),
    private readonly domainService = new RepairDomainService(),
    private readonly assetAccessService = new AssetAccessService(),
    private readonly inventoryRepository = new FirestoreInventoryRepository(),
    private readonly inventoryDomainService = new InventoryDomainService(),
    private readonly userRepository = new FirestoreUserRepository(),
  ) {}

  canView(profile: UserProfile): boolean {
    return REPAIR_READ_ROLES.some((role) => role === profile.role);
  }

  canCreate(profile: UserProfile): boolean {
    return REPAIR_CREATE_ROLES.some((role) => role === profile.role);
  }

  canAssign(profile: UserProfile): boolean {
    return profile.role === "admin";
  }

  canWork(profile: UserProfile, ticket: RepairTicket): boolean {
    return (
      profile.role === "admin" ||
      (profile.role === "technician" &&
        ticket.assignedTechnicianId === profile.uid &&
        ticket.assignmentStatus === "accepted")
    );
  }

  async list(profile: UserProfile): Promise<readonly RepairTicket[]> {
    if (!this.canView(profile)) {
      throw new RepairError(
        "REPAIR_ACCESS_DENIED",
        "You cannot view repair tickets.",
      );
    }
    if (
      (profile.role === "branch" && !profile.warehouseId) ||
      (profile.role === "customer" && !profile.customerId)
    ) {
      return [];
    }
    return this.repository.list({
      technicianId: profile.role === "technician" ? profile.uid : null,
      warehouseId: profile.role === "branch" ? profile.warehouseId : null,
      customerId: profile.role === "customer" ? profile.customerId : null,
      limit: 100,
    });
  }

  async get(id: string, profile: UserProfile): Promise<RepairTicket> {
    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new RepairError("REPAIR_NOT_FOUND", "Repair ticket was not found.");
    }

    const allowed =
      profile.role === "admin" ||
      profile.role === "warehouse" ||
      profile.role === "sales" ||
      profile.role === "executive" ||
      (profile.role === "technician" &&
        ticket.assignedTechnicianId === profile.uid) ||
      (profile.role === "branch" &&
        profile.warehouseId !== null &&
        ticket.warehouseId === profile.warehouseId) ||
      (profile.role === "customer" &&
        profile.customerId !== null &&
        ticket.customerId === profile.customerId);

    if (!allowed) {
      throw new RepairError(
        "REPAIR_ACCESS_DENIED",
        "You cannot view this repair ticket.",
      );
    }
    return ticket;
  }

  async create(
    input: CreateRepairTicketInput,
    context: RepairRequestContext,
  ): Promise<RepairTicket> {
    if (!this.canCreate(context.actor)) {
      throw new RepairError(
        "REPAIR_ACCESS_DENIED",
        "You cannot create repair tickets.",
      );
    }
    const asset = await this.assetRepository.findByReference(input.assetCode);
    if (!asset) {
      throw new RepairError("ASSET_NOT_FOUND", "Asset was not found.");
    }
    if (!this.assetAccessService.canRead(context.actor, asset)) {
      throw new RepairError(
        "REPAIR_ACCESS_DENIED",
        "You cannot create a repair ticket for this asset.",
      );
    }

    const now = new Date();
    const ticket = this.domainService.create(
      this.repository.createId(),
      asset,
      input,
      context.actor.uid,
      now,
    );
    await this.repository.commit(
      this.commit(ticket, null, "Repair ticket created", context, now, null),
    );
    return ticket;
  }

  async assign(
    id: string,
    input: AssignRepairTicketInput,
    context: RepairRequestContext,
  ): Promise<RepairTicket> {
    if (!this.canAssign(context.actor)) {
      throw new RepairError(
        "REPAIR_ACCESS_DENIED",
        "Only administrators can assign repair technicians.",
      );
    }
    const current = await this.get(id, context.actor);
    const technician = await this.userRepository.findById(input.technicianId);
    if (
      !technician ||
      technician.role !== "technician" ||
      technician.status === "disabled"
    ) {
      throw new RepairError(
        "TECHNICIAN_REQUIRED",
        "Select an active technician account.",
      );
    }
    const now = new Date();
    const ticket = this.domainService.assign(
      current,
      {
        ...input,
        technicianName: technician.displayName,
      },
      context.actor.uid,
      now,
    );
    await this.repository.commit(
      this.commit(
        ticket,
        current,
        "Repair assigned",
        context,
        now,
        current.version,
      ),
    );
    return ticket;
  }

  async update(
    id: string,
    input: UpdateRepairTicketInput,
    context: RepairRequestContext,
  ): Promise<RepairTicket> {
    const current = await this.get(id, context.actor);
    if (!this.canWork(context.actor, current)) {
      throw new RepairError(
        "REPAIR_ACCESS_DENIED",
        "You cannot update this repair ticket.",
      );
    }
    const photoPrefix = `repairs/${current.id}/photos/`;
    if (
      input.photos.some((photo) => !photo.storagePath.startsWith(photoPrefix))
    ) {
      throw new RepairError(
        "INVALID_REPAIR_EVIDENCE",
        "Repair photo path is invalid.",
      );
    }
    const existingPhotos = new Map(
      current.photos.map((photo) => [photo.id, photo]),
    );
    const normalizedInput = {
      ...input,
      photos: input.photos.map(
        (photo) => existingPhotos.get(photo.id) ?? photo,
      ),
    };
    const now = new Date();
    const ticket = this.domainService.update(
      current,
      normalizedInput,
      context.actor.uid,
      now,
    );
    const statusChanged = ticket.status !== current.status;
    const inventoryIssues =
      ticket.status === "completed" && current.status !== "completed"
        ? await this.createInventoryIssues(ticket, context, now)
        : [];
    await this.repository.commit(
      this.commit(
        ticket,
        statusChanged ? current : null,
        statusChanged ? `Repair status: ${ticket.status}` : "Repair updated",
        context,
        now,
        current.version,
        inventoryIssues,
      ),
    );
    return ticket;
  }

  private commit(
    ticket: RepairTicket,
    previous: RepairTicket | null,
    title: string,
    context: RepairRequestContext,
    occurredAt: Date,
    expectedVersion: number | null,
    inventoryIssues: RepairCommit["inventoryIssues"] = [],
  ): RepairCommit {
    const statusChange = {
      before: previous?.status ?? null,
      after: ticket.status,
    };
    const assetEvent: AssetEvent | null =
      previous === null && expectedVersion !== null
        ? null
        : {
            id: crypto.randomUUID(),
            assetId: ticket.assetId,
            type: "repair",
            title,
            description: `${title}: ${ticket.ticketNumber} - ${ticket.title}`,
            changes: { status: statusChange },
            actorId: context.actor.uid,
            actorDisplayName: context.actor.displayName,
            actorRole: context.actor.role,
            occurredAt,
            correlationId: context.correlationId,
          };
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      action:
        expectedVersion === null
          ? "repair.created"
          : previous
            ? "repair.status_changed"
            : "repair.updated",
      entityType: "asset",
      entityId: ticket.assetId,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      changes: {
        repairTicketId: ticket.id,
        status: statusChange,
        laborCost: ticket.laborCost,
        partsCount: ticket.partsUsed.length,
        photosCount: ticket.photos.length,
      },
      occurredAt,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };
    return {
      ticket,
      assetEvent,
      auditLog,
      expectedVersion,
      inventoryIssues,
    };
  }

  private async createInventoryIssues(
    ticket: RepairTicket,
    context: RepairRequestContext,
    now: Date,
  ): Promise<RepairCommit["inventoryIssues"]> {
    const requestedByNumber = new Map<
      string,
      RepairTicket["partsUsed"][number]
    >();
    for (const used of ticket.partsUsed) {
      if (used.quantity <= 0) continue;
      const partNumber = used.partNumber.trim().toUpperCase();
      const existing = requestedByNumber.get(partNumber);
      requestedByNumber.set(partNumber, {
        ...used,
        partNumber,
        quantity: (existing?.quantity ?? 0) + used.quantity,
      });
    }
    const requested = [...requestedByNumber.values()];
    if (requested.length === 0) return [];
    const inventoryParts = await this.inventoryRepository.findByPartNumbers(
      requested.map((part) => part.partNumber),
    );
    const byNumber = new Map(
      inventoryParts.map((part) => [part.partNumber, part]),
    );
    return requested.map((used) => {
      const part = byNumber.get(used.partNumber.trim().toUpperCase());
      if (!part) {
        throw new RepairError(
          "INVALID_REPAIR_EVIDENCE",
          `Inventory part ${used.partNumber} was not found.`,
        );
      }
      const result = this.inventoryDomainService.move(
        part,
        {
          partId: part.id,
          type: "issue",
          quantity: used.quantity,
          unitCost: used.unitCost,
          notes: `Issued to repair ${ticket.ticketNumber}`,
          expectedVersion: part.version,
        },
        context.actor.uid,
        now,
        { type: "repair", id: ticket.id },
      );
      return {
        part: result.part,
        movement: result.movement,
        expectedVersion: part.version,
      };
    });
  }
}
