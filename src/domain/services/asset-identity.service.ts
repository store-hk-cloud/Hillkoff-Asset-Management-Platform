import type { Asset } from "@/domain/entities/asset";
import type {
  NfcRegistration,
  NfcTagType,
} from "@/domain/entities/nfc-registration";
import { AssetIdentityError } from "@/domain/errors/asset-identity.error";
import type { AssetPublicUrls } from "@/domain/value-objects/asset-public-url";
import type { PublicId } from "@/domain/value-objects/public-id";
import type { UserId } from "@/domain/value-objects/user-id";
import type { NfcVerificationStrategy } from "@/domain/services/nfc-verification-strategy";

export interface AssetIdentityProvision {
  readonly publicId: PublicId;
  readonly urls: AssetPublicUrls;
}

export class AssetIdentityService {
  applyIdentity(
    asset: Asset,
    identity: AssetIdentityProvision,
    actorId: UserId,
    now: Date,
  ): Asset {
    if (asset.publicId) {
      return asset;
    }

    return {
      ...asset,
      publicId: identity.publicId,
      nfcUrl: identity.urls.nfcUrl,
      qrUrl: identity.urls.qrUrl,
      updatedAt: now,
      updatedBy: actorId,
      version: asset.version + 1,
    };
  }

  register(
    asset: Asset,
    tagType: NfcTagType,
    actorId: UserId,
    correlationId: string,
    now: Date,
  ): { asset: Asset; registration: NfcRegistration } {
    if (!asset.publicId || !asset.nfcUrl) {
      throw new AssetIdentityError(
        "PUBLIC_ID_NOT_FOUND",
        "The asset does not have a public identity.",
      );
    }

    return {
      asset: {
        ...asset,
        nfcStatus: "registered",
        nfcTagType: tagType,
        nfcRegisteredAt: now,
        nfcVerifiedAt: null,
        updatedAt: now,
        updatedBy: actorId,
        version: asset.version + 1,
      },
      registration: {
        id: crypto.randomUUID(),
        assetId: asset.id,
        publicId: asset.publicId,
        tagType,
        status: "registered",
        expectedUrl: asset.nfcUrl,
        observedUrl: null,
        tagSerialNumber: null,
        registeredAt: now,
        registeredBy: actorId,
        verifiedAt: null,
        verifiedBy: null,
        correlationId,
      },
    };
  }

  async verify(
    asset: Asset,
    registration: NfcRegistration,
    observedUrl: string,
    tagSerialNumber: string | null,
    actorId: UserId,
    strategy: NfcVerificationStrategy,
    now: Date,
  ): Promise<{ asset: Asset; registration: NfcRegistration }> {
    const result = await strategy.verify({
      expectedUrl: registration.expectedUrl,
      observedUrl,
      tagSerialNumber,
    });
    const status = result.valid ? "verified" : "mismatch";

    return {
      asset: {
        ...asset,
        nfcStatus: status,
        nfcVerifiedAt: now,
        updatedAt: now,
        updatedBy: actorId,
        version: asset.version + 1,
      },
      registration: {
        ...registration,
        status,
        observedUrl,
        tagSerialNumber,
        verifiedAt: now,
        verifiedBy: actorId,
      },
    };
  }
}
