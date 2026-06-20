import type { Entity } from "@/domain/entities/entity";
import type { AssetId } from "@/domain/value-objects/asset-id";
import type { PublicId } from "@/domain/value-objects/public-id";
import type { UserId } from "@/domain/value-objects/user-id";

export const ASSET_STATUSES = ["active", "archived"] as const;
export const ASSET_CONDITIONS = [
  "operational",
  "needs_repair",
  "out_of_service",
] as const;
export const ASSET_CUSTODY_TYPES = ["branch", "customer"] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];
export type AssetCustodyType = (typeof ASSET_CUSTODY_TYPES)[number];
export type AssetNfcStatus =
  | "unregistered"
  | "registered"
  | "verified"
  | "mismatch"
  | "revoked";

export type AssetOperationalStatus =
  | "in_stock"
  | "sold"
  | "in_use"
  | "archived";

export interface AssetCatalog {
  readonly assetCode: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly defaultBranchId: string | null;
  readonly defaultLocationName: string;
  readonly updatedAt: Date;
}

export interface AssetWarranty {
  readonly status: "inactive" | "active" | "expired";
  readonly startedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly installationId: string | null;
}

export interface AssetDocument {
  readonly id: string;
  readonly name: string;
  readonly storagePath: string;
  readonly contentType: string;
  readonly size: number;
  readonly uploadedAt: Date;
  readonly uploadedBy: UserId;
}

export interface Asset extends Entity<AssetId> {
  readonly assetCode: string;
  readonly publicId: PublicId | null;
  readonly nfcUrl: string | null;
  readonly qrUrl: string | null;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly serialNumber: string | null;
  readonly condition: AssetCondition;
  readonly status: AssetStatus;
  readonly custodyType: AssetCustodyType;
  readonly branchId: string | null;
  readonly customerId: string | null;
  readonly locationName: string;
  readonly installedAt: Date | null;
  readonly installationLatitude: number | null;
  readonly installationLongitude: number | null;
  readonly lastMovementAt: Date | null;
  readonly warranty: AssetWarranty;
  readonly nfcStatus: AssetNfcStatus;
  readonly nfcTagType: "ntag213" | "ntag215" | null;
  readonly nfcRegisteredAt: Date | null;
  readonly nfcVerifiedAt: Date | null;
  readonly documents: readonly AssetDocument[];
  readonly searchKeywords: readonly string[];
  readonly createdAt: Date;
  readonly createdBy: UserId;
  readonly updatedAt: Date;
  readonly updatedBy: UserId;
  readonly archivedAt: Date | null;
  readonly archivedBy: UserId | null;
}

export interface AssetCreateInput {
  readonly assetCode: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly serialNumber: string;
  readonly condition: AssetCondition;
  readonly custodyType?: AssetCustodyType;
  readonly branchId: string | null;
  readonly customerId: string | null;
  readonly locationName: string;
  readonly installedAt: Date | null;
}

export interface AssetUpdateInput extends Omit<
  AssetCreateInput,
  "custodyType" | "branchId" | "customerId" | "locationName"
> {
  readonly expectedVersion: number;
}

export interface AssetSearchCriteria {
  readonly query: string;
  readonly status: AssetStatus | "all";
  readonly limit: number;
  readonly branchId: string | null;
  readonly customerId: string | null;
}
