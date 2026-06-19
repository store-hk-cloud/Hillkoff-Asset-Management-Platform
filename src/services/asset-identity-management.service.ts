import "server-only";

import type { Asset } from "@/domain/entities/asset";
import type { AssetEvent } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  NfcRegistration,
  NfcTagType,
} from "@/domain/entities/nfc-registration";
import type { UserProfile } from "@/domain/entities/user-profile";
import { AssetIdentityError } from "@/domain/errors/asset-identity.error";
import type { AssetIdentityCommit } from "@/domain/repositories/asset-identity.repository";
import { AssetIdentityService } from "@/domain/services/asset-identity.service";
import { AssetAccessService } from "@/domain/services/asset-access.service";
import { StaticNdefUrlStrategy } from "@/domain/services/nfc-verification-strategy";
import { createPublicId } from "@/domain/value-objects/public-id";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { FirestoreAssetIdentityRepository } from "@/repositories/firestore/firestore-asset-identity.repository";
import { FirestoreAssetRepository } from "@/repositories/firestore/firestore-asset.repository";

export interface IdentityRequestContext {
  readonly actor: UserProfile;
  readonly correlationId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export interface PublicAssetProjection {
  readonly publicId: string;
  readonly assetCode: string;
  readonly name: string;
  readonly category: string;
  readonly condition: Asset["condition"];
  readonly status: Asset["status"];
  readonly nfcStatus: Asset["nfcStatus"];
}

export class AssetIdentityManagementService {
  constructor(
    private readonly assetRepository = new FirestoreAssetRepository(),
    private readonly identityRepository = new FirestoreAssetIdentityRepository(),
    private readonly identityService = new AssetIdentityService(),
    private readonly accessService = new AssetAccessService(),
    private readonly staticStrategy = new StaticNdefUrlStrategy(),
  ) {}

  async get(
    assetId: string,
    profile: UserProfile,
  ): Promise<{ asset: Asset; registration: NfcRegistration | null }> {
    const asset = await this.assetRepository.findById(createAssetId(assetId));

    if (!asset) {
      throw new AssetIdentityError("ASSET_NOT_FOUND", "Asset was not found.");
    }

    this.accessService.requireRead(profile, asset);
    return {
      asset,
      registration: await this.identityRepository.findLatestRegistration(
        asset.id,
      ),
    };
  }

  canRegister(profile: UserProfile): boolean {
    return profile.role === "admin" || profile.role === "warehouse";
  }

  canVerify(profile: UserProfile): boolean {
    return (
      profile.role === "admin" ||
      profile.role === "warehouse" ||
      profile.role === "technician"
    );
  }

  async lookupPublic(publicIdValue: string): Promise<PublicAssetProjection> {
    const asset = await this.assetRepository.findByPublicId(
      createPublicId(publicIdValue),
    );

    if (!asset) {
      throw new AssetIdentityError(
        "PUBLIC_ID_NOT_FOUND",
        "Public asset was not found.",
      );
    }

    return {
      publicId: publicIdValue,
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category,
      condition: asset.condition,
      status: asset.status,
      nfcStatus: asset.nfcStatus,
    };
  }

  async register(
    assetId: string,
    tagType: NfcTagType,
    context: IdentityRequestContext,
  ): Promise<NfcRegistration> {
    this.requireRegister(context.actor);
    const { asset } = await this.get(assetId, context.actor);
    const now = new Date();
    const transition = this.identityService.register(
      asset,
      tagType,
      context.actor.uid,
      context.correlationId,
      now,
    );
    await this.commit(
      asset,
      transition.asset,
      transition.registration,
      "nfc_registered",
      "NFC tag registered",
      true,
      context,
      now,
    );
    return transition.registration;
  }

  async verify(
    assetId: string,
    observedUrl: string,
    tagSerialNumber: string | null,
    context: IdentityRequestContext,
  ): Promise<NfcRegistration> {
    this.requireVerify(context.actor);
    const { asset, registration } = await this.get(assetId, context.actor);

    if (!registration) {
      throw new AssetIdentityError(
        "INVALID_NFC_TAG",
        "Register the NFC tag before verification.",
      );
    }

    const now = new Date();
    const transition = await this.identityService.verify(
      asset,
      registration,
      observedUrl,
      tagSerialNumber,
      context.actor.uid,
      this.staticStrategy,
      now,
    );
    await this.commit(
      asset,
      transition.asset,
      transition.registration,
      transition.registration.status === "verified"
        ? "nfc_verified"
        : "nfc_mismatch",
      transition.registration.status === "verified"
        ? "NFC tag verified"
        : "NFC tag mismatch",
      false,
      context,
      now,
    );
    return transition.registration;
  }

  private requireRegister(profile: UserProfile): void {
    if (!this.canRegister(profile)) {
      throw new AssetIdentityError(
        "IDENTITY_ACCESS_DENIED",
        "You cannot register NFC tags.",
      );
    }
  }

  private requireVerify(profile: UserProfile): void {
    if (!this.canVerify(profile)) {
      throw new AssetIdentityError(
        "IDENTITY_ACCESS_DENIED",
        "You cannot verify NFC tags.",
      );
    }
  }

  private async commit(
    previous: Asset,
    asset: Asset,
    registration: NfcRegistration,
    eventType: AssetEvent["type"],
    title: string,
    createRegistration: boolean,
    context: IdentityRequestContext,
    occurredAt: Date,
  ): Promise<void> {
    const changes = {
      nfcStatus: { before: previous.nfcStatus, after: asset.nfcStatus },
      nfcTagType: { before: previous.nfcTagType, after: asset.nfcTagType },
    };
    const event: AssetEvent = {
      id: crypto.randomUUID(),
      assetId: asset.id,
      type: eventType,
      title,
      description: `${title}: ${asset.assetCode} - ${asset.name}`,
      changes,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      occurredAt,
      correlationId: context.correlationId,
    };
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      action: `asset_identity.${eventType}`,
      entityType: "asset",
      entityId: asset.id,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      changes: { ...changes, registrationId: registration.id },
      occurredAt,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };
    const commit: AssetIdentityCommit = {
      asset,
      registration,
      event,
      auditLog,
      expectedVersion: previous.version,
      createRegistration,
    };
    await this.identityRepository.commit(commit);
  }
}
