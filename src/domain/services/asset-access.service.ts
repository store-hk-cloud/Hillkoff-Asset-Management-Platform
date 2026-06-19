import type { Asset } from "@/domain/entities/asset";
import { AssetError } from "@/domain/errors/asset.error";
import type { DomainService } from "@/domain/services/domain-service";
import type { UserProfile } from "@/domain/entities/user-profile";

const ASSET_WRITE_ROLES = ["admin", "warehouse"] as const;

export class AssetAccessService implements DomainService {
  readonly serviceName = "AssetAccessService";

  canRead(profile: UserProfile, asset: Asset): boolean {
    if (profile.role === "customer") {
      return (
        profile.customerId !== null && asset.customerId === profile.customerId
      );
    }

    if (profile.role === "branch") {
      return profile.branchId !== null && asset.branchId === profile.branchId;
    }

    return true;
  }

  requireRead(profile: UserProfile, asset: Asset): void {
    if (!this.canRead(profile, asset)) {
      throw new AssetError(
        "ASSET_ACCESS_DENIED",
        "You do not have permission to view this asset.",
      );
    }
  }

  canWrite(profile: UserProfile): boolean {
    return ASSET_WRITE_ROLES.some((role) => role === profile.role);
  }

  requireWrite(profile: UserProfile): void {
    if (!this.canWrite(profile)) {
      throw new AssetError(
        "ASSET_ACCESS_DENIED",
        "You do not have permission to change assets.",
      );
    }
  }
}
