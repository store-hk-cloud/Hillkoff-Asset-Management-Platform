import type {
  Asset,
  AssetCreateInput,
  AssetUpdateInput,
} from "@/domain/entities/asset";
import type { AssetFieldChange } from "@/domain/entities/asset-event";
import { AssetError } from "@/domain/errors/asset.error";
import type { DomainService } from "@/domain/services/domain-service";
import type { AssetId } from "@/domain/value-objects/asset-id";
import type { AssetIdentityProvision } from "@/domain/services/asset-identity.service";
import type { UserId } from "@/domain/value-objects/user-id";

export interface AssetTransition {
  readonly asset: Asset;
  readonly changes: Readonly<Record<string, AssetFieldChange>>;
}

function normalizeKeyword(value: string): string {
  return value.trim().toLocaleLowerCase("th-TH");
}

type SearchableAssetInput = Pick<
  AssetCreateInput,
  "assetCode" | "name" | "category" | "serialNumber" | "locationName"
>;

function buildSearchKeywords(input: SearchableAssetInput): readonly string[] {
  const values = [
    input.assetCode,
    input.name,
    input.category,
    input.serialNumber ?? "",
    input.locationName,
  ];

  return [
    ...new Set(
      values
        .flatMap((value) => normalizeKeyword(value).split(/\s+/))
        .filter(Boolean),
    ),
  ].slice(0, 50);
}

function createChanges(
  previous: Asset,
  current: Asset,
): Readonly<Record<string, AssetFieldChange>> {
  const fields = [
    "assetCode",
    "name",
    "description",
    "category",
    "serialNumber",
    "condition",
    "status",
    "branchId",
    "customerId",
    "locationName",
    "installedAt",
    "archivedAt",
  ] as const;
  const changes: Record<string, AssetFieldChange> = {};

  for (const field of fields) {
    const before = previous[field];
    const after = current[field];
    const beforeValue = before instanceof Date ? before.toISOString() : before;
    const afterValue = after instanceof Date ? after.toISOString() : after;

    if (beforeValue !== afterValue) {
      changes[field] = { before: beforeValue, after: afterValue };
    }
  }

  return changes;
}

export class AssetLifecycleService implements DomainService {
  readonly serviceName = "AssetLifecycleService";

  create(
    id: AssetId,
    input: AssetCreateInput,
    actorId: UserId,
    now: Date,
    identity?: AssetIdentityProvision,
  ): AssetTransition {
    const assetCode = input.assetCode.trim().toUpperCase();
    const name = input.name.trim();
    const category = input.category.trim();

    if (!assetCode || !name || !category) {
      throw new AssetError(
        "INVALID_ASSET",
        "Asset code, name, and category are required.",
      );
    }

    const serialNumber = input.serialNumber.trim().toUpperCase();

    if (!serialNumber) {
      throw new AssetError("INVALID_ASSET", "Serial number is required.");
    }

    const normalizedInput = {
      assetCode,
      name,
      description: input.description.trim(),
      category,
      serialNumber,
      condition: input.condition,
      custodyType:
        input.custodyType ?? (input.customerId?.trim() ? "customer" : "branch"),
      locationName: input.locationName.trim(),
      branchId: input.branchId?.trim() || null,
      customerId: input.customerId?.trim() || null,
      installedAt: input.installedAt,
    };
    const asset: Asset = {
      id,
      ...normalizedInput,
      publicId: identity?.publicId ?? null,
      nfcUrl: identity?.urls.nfcUrl ?? null,
      qrUrl: identity?.urls.qrUrl ?? null,
      status: "active",
      lastMovementAt: null,
      installationLatitude: null,
      installationLongitude: null,
      warranty: {
        status: "inactive",
        startedAt: null,
        expiresAt: null,
        installationId: null,
      },
      nfcStatus: "unregistered",
      nfcTagType: null,
      nfcRegisteredAt: null,
      nfcVerifiedAt: null,
      documents: [],
      searchKeywords: buildSearchKeywords(normalizedInput),
      version: 0,
      createdAt: now,
      createdBy: actorId,
      updatedAt: now,
      updatedBy: actorId,
      archivedAt: null,
      archivedBy: null,
    };

    return {
      asset,
      changes: {
        created: { before: null, after: assetCode },
      },
    };
  }

  update(
    current: Asset,
    input: AssetUpdateInput,
    actorId: UserId,
    now: Date,
  ): AssetTransition {
    if (current.status === "archived") {
      throw new AssetError(
        "ASSET_ARCHIVED",
        "Archived assets cannot be edited.",
      );
    }

    if (current.version !== input.expectedVersion) {
      throw new AssetError(
        "ASSET_VERSION_CONFLICT",
        "The asset has changed. Reload and try again.",
      );
    }

    const normalizedInput = {
      assetCode: input.assetCode.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      serialNumber: input.serialNumber.trim().toUpperCase(),
      condition: input.condition,
      installedAt: input.installedAt,
    };
    const updated: Asset = {
      ...current,
      ...normalizedInput,
      searchKeywords: buildSearchKeywords({
        ...normalizedInput,
        locationName: current.locationName,
      }),
      version: current.version + 1,
      updatedAt: now,
      updatedBy: actorId,
    };

    return { asset: updated, changes: createChanges(current, updated) };
  }

  archive(current: Asset, actorId: UserId, now: Date): AssetTransition {
    if (current.status === "archived") {
      throw new AssetError(
        "ASSET_ALREADY_ARCHIVED",
        "The asset is already archived.",
      );
    }

    const archived: Asset = {
      ...current,
      status: "archived",
      version: current.version + 1,
      updatedAt: now,
      updatedBy: actorId,
      archivedAt: now,
      archivedBy: actorId,
    };

    return { asset: archived, changes: createChanges(current, archived) };
  }
}
