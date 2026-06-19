import type { AssetId } from "@/domain/value-objects/asset-id";
import type { PublicId } from "@/domain/value-objects/public-id";
import type { UserId } from "@/domain/value-objects/user-id";

export const NFC_TAG_TYPES = ["ntag213", "ntag215"] as const;
export const NFC_REGISTRATION_STATUSES = [
  "registered",
  "verified",
  "mismatch",
  "revoked",
] as const;

export type NfcTagType = (typeof NFC_TAG_TYPES)[number];
export type NfcRegistrationStatus = (typeof NFC_REGISTRATION_STATUSES)[number];

export interface NfcRegistration {
  readonly id: string;
  readonly assetId: AssetId;
  readonly publicId: PublicId;
  readonly tagType: NfcTagType;
  readonly status: NfcRegistrationStatus;
  readonly expectedUrl: string;
  readonly observedUrl: string | null;
  readonly tagSerialNumber: string | null;
  readonly registeredAt: Date;
  readonly registeredBy: UserId;
  readonly verifiedAt: Date | null;
  readonly verifiedBy: UserId | null;
  readonly correlationId: string;
}
