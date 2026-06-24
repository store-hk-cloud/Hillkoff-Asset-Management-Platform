import "server-only";

import type { AssetEvent, AssetEventType } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  TechnicianSummary,
  TechnicianWorkItem,
  TechnicianWorkType,
  TechnicianWorkspace,
} from "@/domain/entities/technician-work";
import type { UserProfile } from "@/domain/entities/user-profile";
import {
  TechnicianAssignmentError,
  TechnicianAssignmentService,
} from "@/domain/services/technician-assignment.service";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { createUserId } from "@/domain/value-objects/user-id";
import { FirestoreAssetRepository } from "@/repositories/firestore/firestore-asset.repository";
import { FirestoreTechnicianRepository } from "@/repositories/firestore/firestore-technician.repository";
import { FirestoreUserRepository } from "@/repositories/firestore/firestore-user.repository";

export interface TechnicianRequestContext {
  readonly actor: UserProfile;
  readonly correlationId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export class TechnicianWorkspaceService {
  constructor(
    private readonly repository = new FirestoreTechnicianRepository(),
    private readonly userRepository = new FirestoreUserRepository(),
    private readonly assetRepository = new FirestoreAssetRepository(),
    private readonly domainService = new TechnicianAssignmentService(),
  ) {}

  async technicians(
    profile: UserProfile,
  ): Promise<readonly TechnicianSummary[]> {
    if (!["admin", "warehouse", "sales"].includes(profile.role)) {
      throw new TechnicianAssignmentError(
        "TECHNICIAN_ACCESS_DENIED",
        "You cannot list technicians.",
      );
    }
    return (await this.userRepository.list())
      .filter(
        (user) => user.role === "technician" && user.status !== "disabled",
      )
      .map((user) => ({
        id: user.uid,
        displayName: user.displayName,
        email: user.email,
        status: user.status,
      }));
  }

  async workspace(profile: UserProfile): Promise<TechnicianWorkspace> {
    this.requireTechnician(profile);
    return this.buildWorkspace(
      await this.repository.listWork(profile.uid, 300),
    );
  }

  async workspaceFor(
    technicianId: string,
    profile: UserProfile,
  ): Promise<{
    technician: TechnicianSummary;
    workspace: TechnicianWorkspace;
  }> {
    if (!["admin", "executive"].includes(profile.role)) {
      throw new TechnicianAssignmentError(
        "TECHNICIAN_ACCESS_DENIED",
        "You cannot view technician history.",
      );
    }
    const technician = await this.userRepository.findById(
      createUserId(technicianId),
    );
    if (!technician || technician.role !== "technician") {
      throw new TechnicianAssignmentError(
        "TECHNICIAN_WORK_NOT_FOUND",
        "Technician account was not found.",
      );
    }
    return {
      technician: {
        id: technician.uid,
        displayName: technician.displayName,
        email: technician.email,
        status: technician.status,
      },
      workspace: this.buildWorkspace(
        await this.repository.listWork(technician.uid, 500),
      ),
    };
  }

  private buildWorkspace(
    work: readonly TechnicianWorkItem[],
  ): TechnicianWorkspace {
    const todayKey = dateKey(new Date());
    const active = work.filter(
      (item) =>
        !["completed", "closed", "cancelled"].includes(item.workStatus) &&
        item.assignmentStatus !== "rejected",
    );
    const history = work.filter(
      (item) =>
        ["completed", "closed", "cancelled"].includes(item.workStatus) ||
        item.assignmentStatus === "rejected",
    );
    return {
      newCount: active.filter((item) => item.assignmentStatus === "pending")
        .length,
      inProgressCount: active.filter(
        (item) =>
          item.assignmentStatus === "accepted" &&
          ["in_progress", "waiting_parts"].includes(item.workStatus),
      ).length,
      overdueCount: active.filter((item) => item.overdue).length,
      today: active.filter((item) => dateKey(item.scheduledAt) === todayKey),
      active,
      history,
    };
  }

  async respond(
    type: TechnicianWorkType,
    id: string,
    input: {
      expectedVersion: number;
      action: "accept" | "reject";
      reason: string;
    },
    context: TechnicianRequestContext,
  ) {
    this.requireTechnician(context.actor);
    const work = await this.repository.findWork(type, id);
    if (!work) {
      throw new TechnicianAssignmentError(
        "TECHNICIAN_WORK_NOT_FOUND",
        "Technician work was not found.",
      );
    }
    if (work.assignedTechnicianId !== context.actor.uid) {
      throw new TechnicianAssignmentError(
        "TECHNICIAN_ACCESS_DENIED",
        "This work is assigned to another technician.",
      );
    }
    const response = this.domainService.respond(
      work.assignmentStatus,
      input.action,
      input.reason,
    );
    const now = new Date();
    const eventType: AssetEventType =
      input.action === "accept"
        ? "technician_assignment_accepted"
        : "technician_assignment_rejected";
    await this.repository.updateAssignment({
      workType: type,
      workId: id,
      expectedVersion: input.expectedVersion,
      technicianId: context.actor.uid,
      technicianName: context.actor.displayName,
      assignmentStatus: response.status,
      respondedAt: now,
      rejectionReason: response.rejectionReason,
      resetRepairStatus: type === "repair" && input.action === "reject",
      auditLog: this.audit(
        `technician.assignment_${input.action}`,
        type,
        id,
        context,
        now,
        response,
      ),
      assetEvent: this.event(
        eventType,
        work.assetId,
        work.number,
        context,
        now,
        response,
      ),
    });
    return { status: response.status, version: input.expectedVersion + 1 };
  }

  async assign(
    type: TechnicianWorkType,
    id: string,
    input: { expectedVersion: number; technicianId: string },
    context: TechnicianRequestContext,
  ) {
    const allowedRoles: Record<TechnicianWorkType, readonly string[]> = {
      repair: ["admin"],
      pm: ["admin", "warehouse"],
      installation: ["admin", "sales"],
    };
    if (!allowedRoles[type].includes(context.actor.role)) {
      throw new TechnicianAssignmentError(
        "TECHNICIAN_ACCESS_DENIED",
        "You cannot assign technician work.",
      );
    }
    const work = await this.repository.findWork(type, id);
    const technician = await this.userRepository.findById(
      createUserId(input.technicianId),
    );
    if (!work) {
      throw new TechnicianAssignmentError(
        "TECHNICIAN_WORK_NOT_FOUND",
        "Technician work was not found.",
      );
    }
    if (
      !technician ||
      technician.role !== "technician" ||
      technician.status === "disabled"
    ) {
      throw new TechnicianAssignmentError(
        "TECHNICIAN_INVALID_ASSIGNMENT",
        "Select an active technician account.",
      );
    }
    const now = new Date();
    const response = {
      status: "pending" as const,
      rejectionReason: null,
    };
    await this.repository.updateAssignment({
      workType: type,
      workId: id,
      expectedVersion: input.expectedVersion,
      technicianId: technician.uid,
      technicianName: technician.displayName,
      assignmentStatus: "pending",
      respondedAt: null,
      rejectionReason: null,
      resetRepairStatus: false,
      auditLog: this.audit("technician.assigned", type, id, context, now, {
        technicianId: technician.uid,
      }),
      assetEvent: this.event(
        "technician_assigned",
        work.assetId,
        work.number,
        context,
        now,
        { technicianId: technician.uid },
      ),
    });
    return {
      technicianId: technician.uid,
      technicianName: technician.displayName,
      status: response.status,
      version: input.expectedVersion + 1,
    };
  }

  async lookup(reference: string, profile: UserProfile) {
    this.requireTechnician(profile);
    const asset = await this.assetRepository.findByReference(reference);
    if (!asset) return { asset: null, work: [] };
    const work = await this.repository.findWorkByAsset(profile.uid, asset.id);
    return {
      asset: {
        id: asset.id,
        assetCode: asset.assetCode,
        name: asset.name,
        serialNumber: asset.serialNumber,
      },
      work,
    };
  }

  private requireTechnician(profile: UserProfile): void {
    if (profile.role !== "technician") {
      throw new TechnicianAssignmentError(
        "TECHNICIAN_ACCESS_DENIED",
        "Technician access is required.",
      );
    }
  }

  private audit(
    action: string,
    type: TechnicianWorkType,
    id: string,
    context: TechnicianRequestContext,
    now: Date,
    changes: Readonly<Record<string, unknown>>,
  ): AuditLog {
    return {
      id: crypto.randomUUID(),
      action,
      entityType: "asset",
      entityId: id,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      changes: { workType: type, workId: id, ...changes },
      occurredAt: now,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };
  }

  private event(
    type: AssetEventType,
    assetId: string,
    number: string,
    context: TechnicianRequestContext,
    now: Date,
    changes: Readonly<Record<string, unknown>>,
  ): AssetEvent {
    return {
      id: crypto.randomUUID(),
      assetId: createAssetId(assetId),
      type,
      title: type.replaceAll("_", " "),
      description: `${number}: ${type.replaceAll("_", " ")}`,
      changes: Object.fromEntries(
        Object.entries(changes).map(([key, value]) => [
          key,
          { before: null, after: value },
        ]),
      ),
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      occurredAt: now,
      correlationId: context.correlationId,
    };
  }
}

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
