import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MovementForm } from "@/features/warehouse/components/movement-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const warehouseService = new WarehouseManagementService();
export const metadata = { title: "ขายลูกค้า" };

export default async function SalePage() {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!warehouseService.canSell(profile)) notFound();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        description={
          locale === "th"
            ? "ส่งมอบเครื่องให้ลูกค้าและบันทึกสาขาผู้ขายใน Movement Log"
            : "Deliver a machine to a customer and record the selling branch."
        }
        eyebrow={locale === "th" ? "คลังสินค้า" : "Warehouse"}
        title={
          locale === "th"
            ? "ขายและส่งมอบให้ลูกค้า"
            : "Sell and deliver to customer"
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "th"
              ? "ขายและส่งมอบให้ลูกค้า"
              : "Sell and deliver to customer"}
          </CardTitle>
          <CardDescription>
            {locale === "th"
              ? "เปลี่ยน Custody เป็นลูกค้าและเก็บสาขาผู้ขายใน Movement Log"
              : "Changes custody to the customer and records the selling branch in the Movement Log."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementForm action="sale" />
        </CardContent>
      </Card>
    </section>
  );
}
