import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetIdentityError } from "@/domain/errors/asset-identity.error";
import { AssetStatusBadge } from "@/features/assets/components/asset-status-badge";
import { getServerTranslator } from "@/lib/i18n/server";
import { getCurrentSession } from "@/lib/auth/dal";
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
  const session = await getCurrentSession();
  const { publicId } = await params;
  let asset;

  try {
    asset = await service.lookupPublic(publicId, Boolean(session));
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
          <CardTitle className="text-2xl">
            Hillkoff Asset Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Detail
            label={locale === "th" ? "ชื่อทรัพย์สิน" : "Asset Name"}
            value={asset.name}
          />
          <Detail label="Serial Number" value={asset.serialNumber || "—"} />
          <Detail
            label={locale === "th" ? "สถานะทรัพย์สิน" : "Asset Status"}
            value={operationalStatusLabel(asset.operationalStatus, locale)}
          />
          {asset.details ? (
            <>
              <Detail
                label={locale === "th" ? "รหัสทรัพย์สิน" : "Asset Code"}
                value={asset.details.assetCode}
              />
              <Detail
                label={locale === "th" ? "หมวดหมู่" : "Category"}
                value={asset.details.category}
              />
              <Detail
                label={locale === "th" ? "คลัง/รหัสสาขา" : "Warehouse / Branch"}
                value={asset.details.branchId ?? "—"}
              />
              <Detail
                label={locale === "th" ? "สถานที่ปัจจุบัน" : "Current Location"}
                value={asset.details.locationName || "—"}
              />
              <Detail
                label={
                  locale === "th"
                    ? "จำนวนรหัสนี้ที่อยู่ในสต็อก"
                    : "In-stock quantity for this code"
                }
                value={String(asset.details.inStockQuantity)}
              />
              <div>
                <p className="text-muted-foreground text-xs">
                  {locale === "th" ? "สภาพ" : "Condition"}
                </p>
                <div className="mt-1">
                  <AssetStatusBadge condition={asset.details.condition} />
                </div>
              </div>
              <Detail
                label={locale === "th" ? "การยืนยัน NFC" : "NFC Verification"}
                value={asset.details.nfcStatus}
              />
            </>
          ) : (
            <p className="text-muted-foreground text-xs sm:col-span-2">
              {locale === "th"
                ? "เข้าสู่ระบบด้วยบัญชีพนักงานเพื่อดูข้อมูลคลังและจำนวนสต็อก"
                : "Staff can sign in to view warehouse and stock information."}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function operationalStatusLabel(
  status: "in_stock" | "sold" | "in_use" | "archived",
  locale: "th" | "en",
): string {
  const labels = {
    th: {
      in_stock: "อยู่ในสต็อก",
      sold: "ขายแล้ว",
      in_use: "กำลังใช้งาน",
      archived: "เก็บถาวร",
    },
    en: {
      in_stock: "In stock",
      sold: "Sold",
      in_use: "In use",
      archived: "Archived",
    },
  } as const;

  return labels[locale][status];
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
