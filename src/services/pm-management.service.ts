import "server-only";

import type { AssetEvent } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  CompletePmInput,
  PmJob,
  SchedulePmInput,
} from "@/domain/entities/pm-job";
import type { UserProfile } from "@/domain/entities/user-profile";
import { PmError } from "@/domain/errors/pm.error";
import { AssetAccessService } from "@/domain/services/asset-access.service";
import { PmDomainService } from "@/domain/services/pm-domain.service";
import { FirestoreAssetRepository } from "@/repositories/firestore/firestore-asset.repository";
import { FirestorePmRepository } from "@/repositories/firestore/firestore-pm.repository";
import { FirestoreUserRepository } from "@/repositories/firestore/firestore-user.repository";

export interface PmRequestContext {
  readonly actor: UserProfile;
  readonly correlationId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export class PmManagementService {
  constructor(
    private readonly repository = new FirestorePmRepository(),
    private readonly assetRepository = new FirestoreAssetRepository(),
    private readonly domainService = new PmDomainService(),
    private readonly assetAccessService = new AssetAccessService(),
    private readonly userRepository = new FirestoreUserRepository(),
  ) {}

  canView(profile: UserProfile): boolean {
    return [
      "admin",
      "warehouse",
      "technician",
      "branch",
      "customer",
      "executive",
    ].includes(profile.role);
  }

  canSchedule(profile: UserProfile): boolean {
    return profile.role === "admin" || profile.role === "warehouse";
  }

  canComplete(profile: UserProfile, job: PmJob): boolean {
    return (
      profile.role === "admin" ||
      (profile.role === "technician" &&
        job.assignedTechnicianId === profile.uid &&
        job.assignmentStatus === "accepted")
    );
  }

  async list(
    profile: UserProfile,
    options: {
      status: "scheduled" | "completed" | "all";
      from?: Date | null;
      to?: Date | null;
    },
  ): Promise<readonly PmJob[]> {
    if (!this.canView(profile)) {
      throw new PmError("PM_ACCESS_DENIED", "You cannot view PM jobs.");
    }
    if (
      (profile.role === "branch" && !profile.branchId) ||
      (profile.role === "customer" && !profile.customerId)
    ) {
      return [];
    }
    const jobs = await this.repository.list({
      technicianId: profile.role === "technician" ? profile.uid : null,
      branchId: profile.role === "branch" ? profile.branchId : null,
      customerId: profile.role === "customer" ? profile.customerId : null,
      status: options.status,
      from: options.from ?? null,
      to: options.to ?? null,
      limit: 200,
    });
    return options.status === "scheduled"
      ? [...jobs].sort(
          (left, right) =>
            left.scheduledAt.getTime() - right.scheduledAt.getTime(),
        )
      : jobs;
  }

  async get(id: string, profile: UserProfile): Promise<PmJob> {
    const job = await this.repository.findById(id);
    if (!job) throw new PmError("PM_NOT_FOUND", "PM job was not found.");
    const allowed =
      profile.role === "admin" ||
      profile.role === "warehouse" ||
      profile.role === "executive" ||
      (profile.role === "technician" &&
        job.assignedTechnicianId === profile.uid) ||
      (profile.role === "branch" &&
        profile.branchId !== null &&
        job.branchId === profile.branchId) ||
      (profile.role === "customer" &&
        profile.customerId !== null &&
        job.customerId === profile.customerId);
    if (!allowed) {
      throw new PmError("PM_ACCESS_DENIED", "You cannot view this PM job.");
    }
    return job;
  }

  async schedule(
    input: SchedulePmInput,
    context: PmRequestContext,
  ): Promise<PmJob> {
    if (!this.canSchedule(context.actor)) {
      throw new PmError("PM_ACCESS_DENIED", "You cannot schedule PM jobs.");
    }
    const asset = await this.assetRepository.findByReference(input.assetCode);
    if (!asset) throw new PmError("ASSET_NOT_FOUND", "Asset was not found.");
    if (!this.assetAccessService.canRead(context.actor, asset)) {
      throw new PmError("PM_ACCESS_DENIED", "You cannot access this asset.");
    }
    const technician = await this.userRepository.findById(
      input.assignedTechnicianId,
    );
    if (
      !technician ||
      technician.role !== "technician" ||
      technician.status === "disabled"
    ) {
      throw new PmError(
        "PM_ACCESS_DENIED",
        "Select an active technician account.",
      );
    }
    const now = new Date();
    const job = this.domainService.schedule(
      this.repository.createId(),
      asset,
      { ...input, assignedTechnicianName: technician.displayName },
      context.actor.uid,
      now,
    );
    await this.repository.schedule(
      job,
      this.audit("pm.scheduled", job, context, now),
    );
    return job;
  }

  async complete(
    id: string,
    input: CompletePmInput,
    context: PmRequestContext,
  ): Promise<PmJob> {
    const current = await this.get(id, context.actor);
    if (!this.canComplete(context.actor, current)) {
      throw new PmError("PM_ACCESS_DENIED", "You cannot complete this PM job.");
    }
    const now = new Date();
    const job = this.domainService.complete(
      current,
      input,
      context.actor.uid,
      now,
    );
    const changes = {
      status: { before: current.status, after: job.status },
      completedAt: { before: null, after: now.toISOString() },
      nextDueAt: {
        before: null,
        after: job.nextDueAt?.toISOString() ?? null,
      },
    };
    const event: AssetEvent = {
      id: crypto.randomUUID(),
      assetId: job.assetId,
      type: "preventive_maintenance",
      title: "Preventive maintenance completed",
      description: `${job.jobNumber}: ${job.title}`,
      changes,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      occurredAt: now,
      correlationId: context.correlationId,
    };
    await this.repository.complete({
      job,
      assetEvent: event,
      auditLog: this.audit("pm.completed", job, context, now, changes),
      expectedVersion: current.version,
    });
    return job;
  }

  private audit(
    action: string,
    job: PmJob,
    context: PmRequestContext,
    occurredAt: Date,
    changes: Readonly<Record<string, unknown>> = {},
  ): AuditLog {
    return {
      id: crypto.randomUUID(),
      action,
      entityType: "asset",
      entityId: job.assetId,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      changes: { pmJobId: job.id, pmStatus: job.status, ...changes },
      occurredAt,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };
  }
}
