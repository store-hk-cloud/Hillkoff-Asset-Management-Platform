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

const accessService = new AssetAccessService();

export const metadata = {
  title: "เพิ่มทรัพย์สิน",
};

export default async function NewAssetPage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();

  if (!accessService.canWrite(profile)) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("assets.add")}</CardTitle>
          <CardDescription>
            {locale === "th"
              ? "การสร้างรายการจะบันทึก Asset Event และ Audit Log โดยอัตโนมัติ"
              : "Creating an asset automatically records an Asset Event and Audit Log."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetForm />
        </CardContent>
      </Card>
    </section>
  );
}
