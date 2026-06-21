import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AssetAccessService } from "@/domain/services/asset-access.service";
import { AssetForm } from "@/features/assets/components/asset-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { AssetManagementService } from "@/services/asset-management.service";

const assetService = new AssetManagementService();
const accessService = new AssetAccessService();

type EditAssetPageProps = {
  params: Promise<{ assetId: string }>;
};

export const metadata = {
  title: "แก้ไขทรัพย์สิน",
};

export default async function EditAssetPage({ params }: EditAssetPageProps) {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();

  if (!accessService.canWrite(profile)) {
    notFound();
  }

  const { assetId } = await params;
  const asset = await assetService.get(assetId, profile);

  if (asset.status === "archived") {
    notFound();
  }

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {t("action.edit")} {asset.assetCode}
          </CardTitle>
          <CardDescription>
            {locale === "th"
              ? "ทุกฟิลด์ที่เปลี่ยนจะถูกบันทึกใน Timeline และ Audit Log"
              : "Every changed field is recorded in the Timeline and Audit Log."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetForm
            initialValues={{
              id: asset.id,
              assetCode: asset.assetCode,
              name: asset.name,
              description: asset.description,
              category: asset.category,
              categoryKey: asset.categoryKey,
              serialNumber: asset.serialNumber,
              color: asset.color ?? "",
              condition: asset.condition,
              warehouseId: asset.warehouseId ?? null,
              customerId: asset.customerId,
              locationName: asset.locationName,
              installedAt: asset.installedAt
                ? asset.installedAt.toISOString().slice(0, 10)
                : null,
              version: asset.version,
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
