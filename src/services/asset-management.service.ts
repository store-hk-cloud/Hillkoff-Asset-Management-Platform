import "server-only";

import type {
  Asset,
  AssetCatalog,
  AssetCategoryCounts,
  AssetCreateInput,
  AssetSearchCriteria,
  AssetUpdateInput,
} from "@/domain/entities/asset";
import type { AssetEvent, AssetEventType } from "@/domain/entities/asset-event";
import type { AuditLog } from "@/domain/entities/audit-log";
import type { UserProfile } from "@/domain/entities/user-profile";
import { AssetError } from "@/domain/errors/asset.error";
import type { AssetCommit } from "@/domain/repositories/asset.repository";
import { AssetAccessService } from "@/domain/services/asset-access.service";
import { AssetLifecycleService } from "@/domain/services/asset-lifecycle.service";
import { createAssetPublicUrls } from "@/domain/value-objects/asset-public-url";
import { generatePublicId } from "@/domain/value-objects/public-id";
import { getClientEnvironment } from "@/lib/env";
import { createAssetId } from "@/domain/value-objects/asset-id";
import { FirestoreAssetRepository } from "@/repositories/firestore/firestore-asset.repository";

export interface AssetRequestContext {
  readonly actor: UserProfile;
  readonly correlationId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export class AssetManagementService {
  constructor(
    private readonly repository = new FirestoreAssetRepository(),
    private readonly lifecycleService = new AssetLifecycleService(),
    private readonly accessService = new AssetAccessService(),
  ) {}

  async list(
    criteria: Omit<AssetSearchCriteria, "warehouseId" | "customerId">,
    profile: UserProfile,
  ): Promise<readonly Asset[]> {
    const scopedCriteria: AssetSearchCriteria = {
      ...criteria,
      warehouseId: profile.role === "branch" ? profile.warehouseId : null,
      customerId: profile.role === "customer" ? profile.customerId : null,
    };

    if (
      (profile.role === "branch" && !profile.warehouseId) ||
      (profile.role === "customer" && !profile.customerId)
    ) {
      return [];
    }

    return this.repository.search(scopedCriteria);
  }

  async getCategoryCounts(
    criteria: Pick<AssetSearchCriteria, "status">,
    profile: UserProfile,
  ): Promise<AssetCategoryCounts> {
    if (
      (profile.role === "branch" && !profile.warehouseId) ||
      (profile.role === "customer" && !profile.customerId)
    ) {
      return {
        coffee_machine: 0,
        grinder: 0,
        blender: 0,
        milling_machine: 0,
        roaster: 0,
        other: 0,
      };
    }

    return this.repository.countByCategory({
      status: criteria.status,
      warehouseId: profile.role === "branch" ? profile.warehouseId : null,
      customerId: profile.role === "customer" ? profile.customerId : null,
    });
  }

  async get(id: string, profile: UserProfile): Promise<Asset> {
    const asset = await this.repository.findById(createAssetId(id));

    if (!asset) {
      throw new AssetError("ASSET_NOT_FOUND", "Asset was not found.");
    }

    this.accessService.requireRead(profile, asset);
    return asset;
  }

  async getCatalog(
    assetCode: string,
    profile: UserProfile,
  ): Promise<AssetCatalog | null> {
    this.accessService.requireWrite(profile);
    return this.repository.findCatalogByCode(assetCode);
  }

  async listEvents(
    id: string,
    profile: UserProfile,
    types?: readonly AssetEventType[],
  ): Promise<readonly AssetEvent[]> {
    const asset = await this.get(id, profile);
    return this.repository.listEvents(asset.id, types);
  }

  async create(
    input: AssetCreateInput,
    context: AssetRequestContext,
  ): Promise<Asset> {
    this.accessService.requireWrite(context.actor);
    const now = new Date();
    const publicId = generatePublicId();
    const transition = this.lifecycleService.create(
      this.repository.createId(),
      input,
      context.actor.uid,
      now,
      {
        publicId,
        urls: createAssetPublicUrls(
          getClientEnvironment().NEXT_PUBLIC_APP_URL,
          publicId,
        ),
      },
    );
    const commit = this.createCommit(
      transition.asset,
      "created",
      "Asset created",
      transition.changes,
      null,
      context,
      now,
    );

    await this.repository.commit(commit);
    return transition.asset;
  }

  async update(
    id: string,
    input: AssetUpdateInput,
    context: AssetRequestContext,
  ): Promise<Asset> {
    this.accessService.requireWrite(context.actor);
    const current = await this.get(id, context.actor);
    const now = new Date();
    const transition = this.lifecycleService.update(
      current,
      input,
      context.actor.uid,
      now,
    );

    if (Object.keys(transition.changes).length === 0) {
      return current;
    }

    await this.repository.commit(
      this.createCommit(
        transition.asset,
        "updated",
        "Asset updated",
        transition.changes,
        current.version,
        context,
        now,
      ),
    );
    return transition.asset;
  }

  async archive(id: string, context: AssetRequestContext): Promise<Asset> {
    this.accessService.requireWrite(context.actor);
    const current = await this.get(id, context.actor);
    const now = new Date();
    const transition = this.lifecycleService.archive(
      current,
      context.actor.uid,
      now,
    );

    await this.repository.commit(
      this.createCommit(
        transition.asset,
        "archived",
        "Asset archived",
        transition.changes,
        current.version,
        context,
        now,
      ),
    );
    return transition.asset;
  }

  private createCommit(
    asset: Asset,
    eventType: AssetEventType,
    title: string,
    changes: AssetEvent["changes"],
    expectedVersion: number | null,
    context: AssetRequestContext,
    occurredAt: Date,
  ): AssetCommit {
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
      action: `asset.${eventType}`,
      entityType: "asset",
      entityId: asset.id,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      changes,
      occurredAt,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };

    return { asset, event, auditLog, expectedVersion };
  }
}
