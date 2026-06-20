import type { Asset } from "@/domain/entities/asset";
import type {
  AssignRepairTicketInput,
  CreateRepairTicketInput,
  RepairStatus,
  RepairTicket,
  UpdateRepairTicketInput,
} from "@/domain/entities/repair-ticket";
import { RepairError } from "@/domain/errors/repair.error";
import type { UserId } from "@/domain/value-objects/user-id";

const ALLOWED_TRANSITIONS: Readonly<
  Record<RepairStatus, readonly RepairStatus[]>
> = {
  new: ["assigned"],
  assigned: ["in_progress"],
  in_progress: ["waiting_parts", "completed"],
  waiting_parts: ["in_progress", "completed"],
  completed: ["closed"],
  closed: [],
};

export class RepairDomainService {
  create(
    id: string,
    asset: Asset,
    input: CreateRepairTicketInput,
    actorId: UserId,
    now: Date,
  ): RepairTicket {
    if (asset.status === "archived") {
      throw new RepairError(
        "ASSET_ARCHIVED",
        "Archived assets cannot receive repair tickets.",
      );
    }

    return {
      id,
      ticketNumber: `REP-${now
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14)}-${id.slice(0, 6).toUpperCase()}`,
      assetId: asset.id,
      assetCode: asset.assetCode,
      assetName: asset.name,
      branchId: asset.branchId,
      customerId: asset.customerId,
      title: input.title.trim(),
      description: input.description.trim(),
      status: "new",
      assignedTechnicianId: null,
      assignedTechnicianName: null,
      assignmentStatus: null,
      assignmentRespondedAt: null,
      assignmentRejectionReason: null,
      photos: [],
      rootCause: "",
      solution: "",
      laborCost: 0,
      partsUsed: [],
      completedAt: null,
      closedAt: null,
      createdAt: now,
      createdBy: actorId,
      updatedAt: now,
      updatedBy: actorId,
      version: 0,
    };
  }

  assign(
    ticket: RepairTicket,
    input: AssignRepairTicketInput,
    actorId: UserId,
    now: Date,
  ): RepairTicket {
    this.requireVersion(ticket, input.expectedVersion);
    this.requireTransition(ticket.status, "assigned");

    if (!input.technicianName.trim()) {
      throw new RepairError(
        "TECHNICIAN_REQUIRED",
        "Technician name is required.",
      );
    }

    return {
      ...ticket,
      status: "assigned",
      assignedTechnicianId: input.technicianId,
      assignedTechnicianName: input.technicianName.trim(),
      assignmentStatus: "pending",
      assignmentRespondedAt: null,
      assignmentRejectionReason: null,
      updatedAt: now,
      updatedBy: actorId,
      version: ticket.version + 1,
    };
  }

  update(
    ticket: RepairTicket,
    input: UpdateRepairTicketInput,
    actorId: UserId,
    now: Date,
  ): RepairTicket {
    this.requireVersion(ticket, input.expectedVersion);
    if (ticket.status === "closed") {
      throw new RepairError(
        "INVALID_REPAIR_TRANSITION",
        "Closed repair tickets are immutable.",
      );
    }
    const targetStatus = input.targetStatus ?? ticket.status;

    if (targetStatus !== ticket.status) {
      this.requireTransition(ticket.status, targetStatus);
    }

    if (!ticket.assignedTechnicianId && targetStatus !== "new") {
      throw new RepairError(
        "TECHNICIAN_REQUIRED",
        "Assign a technician before changing repair status.",
      );
    }

    const rootCause = input.rootCause.trim();
    const solution = input.solution.trim();
    if (
      (targetStatus === "completed" || targetStatus === "closed") &&
      !rootCause
    ) {
      throw new RepairError(
        "ROOT_CAUSE_REQUIRED",
        "Root cause is required before completion.",
      );
    }
    if (
      (targetStatus === "completed" || targetStatus === "closed") &&
      !solution
    ) {
      throw new RepairError(
        "SOLUTION_REQUIRED",
        "Solution is required before completion.",
      );
    }

    return {
      ...ticket,
      status: targetStatus,
      photos: input.photos,
      rootCause,
      solution,
      laborCost: input.laborCost,
      partsUsed: input.partsUsed,
      completedAt:
        targetStatus === "completed"
          ? now
          : targetStatus === "closed"
            ? ticket.completedAt
            : ticket.completedAt,
      closedAt: targetStatus === "closed" ? now : ticket.closedAt,
      updatedAt: now,
      updatedBy: actorId,
      version: ticket.version + 1,
    };
  }

  allowedTransitions(status: RepairStatus): readonly RepairStatus[] {
    return ALLOWED_TRANSITIONS[status];
  }

  private requireVersion(ticket: RepairTicket, expectedVersion: number): void {
    if (ticket.version !== expectedVersion) {
      throw new RepairError(
        "REPAIR_VERSION_CONFLICT",
        "The repair ticket has changed. Reload and try again.",
      );
    }
  }

  private requireTransition(current: RepairStatus, target: RepairStatus): void {
    if (!ALLOWED_TRANSITIONS[current].includes(target)) {
      throw new RepairError(
        "INVALID_REPAIR_TRANSITION",
        `Repair cannot move from ${current} to ${target}.`,
      );
    }
  }
}
