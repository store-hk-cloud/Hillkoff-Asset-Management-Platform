import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetIdentityError } from "@/domain/errors/asset-identity.error";
import { AssetStatusBadge } from "@/features/assets/components/asset-status-badge";
import { getServerTranslator } from "@/lib/i18n/server";
import { AssetIdentityManagementService } from "@/services/asset-identity-management.service";

const service = new AssetIdentityManagementService();
type PublicAssetPageProps = { params: Promise<{ publicId: string }> };

export const metadata = {
  title: "Asset Verification",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PublicAssetPage({
  params,
}: PublicAssetPageProps) {
  const { locale, t } = await getServerTranslator();
  const { publicId } = await params;
  let asset;

  try {
    asset = await service.lookupPublic(publicId);
  } catch (error) {
    if (
      error instanceof AssetIdentityError &&
      error.code === "PUBLIC_ID_NOT_FOUND"
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="bg-muted/40 grid min-h-dvh place-items-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="text-muted-foreground text-sm">
            {t("public.verification")}
          </p>
          <CardTitle className="text-2xl">{asset.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Detail
            label={locale === "th" ? "รหัสทรัพย์สิน" : "Asset Code"}
            value={asset.assetCode}
          />
          <Detail
            label={locale === "th" ? "หมวดหมู่" : "Category"}
            value={asset.category}
          />
          <div>
            <p className="text-muted-foreground text-xs">
              {locale === "th" ? "สภาพ" : "Condition"}
            </p>
            <div className="mt-1">
              <AssetStatusBadge condition={asset.condition} />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              {locale === "th" ? "สถานะทรัพย์สิน" : "Asset Status"}
            </p>
            <div className="mt-1">
              <AssetStatusBadge status={asset.status} />
            </div>
          </div>
          <Detail
            label={locale === "th" ? "การยืนยัน NFC" : "NFC Verification"}
            value={asset.nfcStatus}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
