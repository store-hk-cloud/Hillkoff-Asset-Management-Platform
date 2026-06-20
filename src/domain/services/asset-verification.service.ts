import type { Asset, AssetOperationalStatus } from "@/domain/entities/asset";
import type { DomainService } from "@/domain/services/domain-service";

export class AssetVerificationService implements DomainService {
  readonly serviceName = "AssetVerificationService";

  getOperationalStatus(asset: Asset): AssetOperationalStatus {
    if (asset.status === "archived") {
      return "archived";
    }

    if (asset.custodyType === "branch") {
      return "in_stock";
    }
    if (asset.custodyType === "in_transit") {
      return "in_transit";
    }

    return asset.installedAt ? "in_use" : "sold";
  }
}
