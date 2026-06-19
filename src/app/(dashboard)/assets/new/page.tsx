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

const accessService = new AssetAccessService();

export const metadata = {
  title: "เพิ่มทรัพย์สิน",
};

export default async function NewAssetPage() {
  const { profile } = await requireSession();

  if (!accessService.canWrite(profile)) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>เพิ่มทรัพย์สิน</CardTitle>
          <CardDescription>
            การสร้างรายการจะบันทึก Asset Event และ Audit Log โดยอัตโนมัติ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetForm />
        </CardContent>
      </Card>
    </section>
  );
}
