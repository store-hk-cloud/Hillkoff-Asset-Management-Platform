import "server-only";

import type { AssetEvent } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  CompleteInstallationInput,
  Installation,
  ScheduleInstallationInput,
} from "@/domain/entities/installation";
import type { UserProfile } from "@/domain/entities/user-profile";
import { InstallationError } from "@/domain/errors/installation.error";
import { InstallationDomainService } from "@/domain/services/installation-domain.service";
import { FirestoreAssetRepository } from "@/repositories/firestore/firestore-asset.repository";
import { FirestoreInstallationRepository } from "@/repositories/firestore/firestore-installation.repository";

export interface InstallationRequestContext {
  readonly actor: UserProfile;
  readonly correlationId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export class InstallationManagementService {
  constructor(
    private readonly repository = new FirestoreInstallationRepository(),
    private readonly assetRepository = new FirestoreAssetRepository(),
    private readonly domainService = new InstallationDomainService(),
  ) {}

  canView(profile: UserProfile): boolean {
    return ["admin", "technician", "sales", "customer", "executive"].includes(
      profile.role,
    );
  }

  canSchedule(profile: UserProfile): boolean {
    return profile.role === "admin" || profile.role === "sales";
  }

  canExecute(profile: UserProfile, installation?: Installation): boolean {
    return (
      profile.role === "admin" ||
      (profile.role === "technician" &&
        (!installation || installation.assignedTechnicianId === profile.uid))
    );
  }

  async listQueue(profile: UserProfile): Promise<readonly Installation[]> {
    if (!this.canView(profile)) {
      throw new InstallationError(
        "INSTALLATION_ACCESS_DENIED",
        "You cannot view installation queue.",
      );
    }

    return this.repository.listQueue({
      technicianId: profile.role === "technician" ? profile.uid : null,
      customerId: profile.role === "customer" ? profile.customerId : null,
      limit: 100,
    });
  }

  async get(id: string, profile: UserProfile): Promise<Installation> {
    const installation = await this.repository.findById(id);
    if (!installation) {
      throw new InstallationError(
        "INSTALLATION_NOT_FOUND",
        "Installation was not found.",
      );
    }

    const allowed =
      profile.role === "admin" ||
      profile.role === "sales" ||
      profile.role === "executive" ||
      (profile.role === "technician" &&
        installation.assignedTechnicianId === profile.uid) ||
      (profile.role === "customer" &&
        profile.customerId === installation.customerId);

    if (!allowed) {
      throw new InstallationError(
        "INSTALLATION_ACCESS_DENIED",
        "You cannot view this installation.",
      );
    }
    return installation;
  }

  async schedule(
    input: ScheduleInstallationInput,
    context: InstallationRequestContext,
  ): Promise<Installation> {
    if (!this.canSchedule(context.actor)) {
      throw new InstallationError(
        "INSTALLATION_ACCESS_DENIED",
        "You cannot schedule installations.",
      );
    }
    const asset = await this.assetRepository.findByCode(input.assetCode);
    if (!asset) {
      throw new InstallationError("ASSET_NOT_FOUND", "Asset was not found.");
    }
    const now = new Date();
    const installation = this.domainService.schedule(
      this.repository.createId(),
      asset,
      input,
      context.actor.uid,
      now,
    );
    await this.repository.schedule(
      installation,
      this.audit("installation.scheduled", installation, context, now),
    );
    return installation;
  }

  async start(
    id: string,
    context: InstallationRequestContext,
  ): Promise<Installation> {
    const current = await this.get(id, context.actor);
    if (!this.canExecute(context.actor, current)) {
      throw new InstallationError(
        "INSTALLATION_ACCESS_DENIED",
        "You cannot execute this installation.",
      );
    }
    const now = new Date();
    const installation = this.domainService.start(
      current,
      context.actor.uid,
      now,
    );
    await this.repository.start(
      installation,
      this.audit("installation.started", installation, context, now),
      current.version,
    );
    return installation;
  }

  async complete(
    id: string,
    input: CompleteInstallationInput,
    context: InstallationRequestContext,
  ): Promise<Installation> {
    const current = await this.get(id, context.actor);
    if (!this.canExecute(context.actor, current)) {
      throw new InstallationError(
        "INSTALLATION_ACCESS_DENIED",
        "You cannot complete this installation.",
      );
    }
    const asset = await this.assetRepository.findById(current.assetId);
    if (!asset) {
      throw new InstallationError("ASSET_NOT_FOUND", "Asset was not found.");
    }
    const photoPrefix = `installations/${current.id}/photos/`;
    if (
      input.photos.some((photo) => !photo.storagePath.startsWith(photoPrefix))
    ) {
      throw new InstallationError(
        "PHOTO_REQUIRED",
        "Installation photo path is invalid.",
      );
    }
    const signaturePath = `installations/${current.id}/signature/customer-signature.png`;
    if (input.signature.storagePath !== signaturePath) {
      throw new InstallationError(
        "SIGNATURE_REQUIRED",
        "Customer signature path is invalid.",
      );
    }
    const now = new Date();
    const completed = this.domainService.complete(
      current,
      asset,
      input,
      context.actor.uid,
      now,
    );
    const changes = {
      installedAt: {
        before: asset.installedAt?.toISOString() ?? null,
        after: now.toISOString(),
      },
      warrantyStatus: {
        before: asset.warranty.status,
        after: "active",
      },
      warrantyExpiresAt: {
        before: asset.warranty.expiresAt?.toISOString() ?? null,
        after: completed.asset.warranty.expiresAt?.toISOString() ?? null,
      },
    };
    const event: AssetEvent = {
      id: crypto.randomUUID(),
      assetId: asset.id,
      type: "installation",
      title: "Installation completed",
      description: `Installation completed at ${current.customerName}`,
      changes,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      occurredAt: now,
      correlationId: context.correlationId,
    };
    const auditLog = this.audit(
      "installation.completed",
      completed.installation,
      context,
      now,
      changes,
    );

    await this.repository.complete({
      installation: completed.installation,
      asset: completed.asset,
      event,
      auditLog,
      expectedInstallationVersion: current.version,
      expectedAssetVersion: asset.version,
    });
    return completed.installation;
  }

  private audit(
    action: string,
    installation: Installation,
    context: InstallationRequestContext,
    occurredAt: Date,
    changes: Readonly<Record<string, unknown>> = {},
  ): AuditLog {
    return {
      id: crypto.randomUUID(),
      action,
      entityType: "asset",
      entityId: installation.assetId,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      changes: {
        installationId: installation.id,
        installationStatus: installation.status,
        ...changes,
      },
      occurredAt,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };
  }
}
