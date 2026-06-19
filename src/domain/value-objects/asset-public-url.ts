import type { PublicId } from "@/domain/value-objects/public-id";

export interface AssetPublicUrls {
  readonly nfcUrl: string;
  readonly qrUrl: string;
}

export function createAssetPublicUrls(
  appUrl: string,
  publicId: PublicId,
): AssetPublicUrls {
  const baseUrl = new URL(appUrl);
  baseUrl.pathname = `/app/a/${publicId}`;
  baseUrl.search = "";
  baseUrl.hash = "";
  const publicUrl = baseUrl.toString();

  return { nfcUrl: publicUrl, qrUrl: publicUrl };
}
