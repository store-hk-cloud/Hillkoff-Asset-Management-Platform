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
export const metadata = { title: "ย้ายคลัง" };

export default async function TransferPage() {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!warehouseService.canTransfer(profile)) notFound();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        description={
          locale === "th"
            ? "ย้ายเครื่องจากคลังปัจจุบันไปยังคลังปลายทางทันที"
            : "Move machines from the current warehouse to a destination."
        }
        eyebrow={locale === "th" ? "คลังสินค้า" : "Warehouse"}
        title={
          locale === "th"
            ? "ย้ายเครื่องระหว่างคลัง"
            : "Move machines between warehouses"
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "th"
              ? "ย้ายเครื่องระหว่างคลัง"
              : "Move machines between warehouses"}
          </CardTitle>
          <CardDescription>
            {locale === "th"
              ? "ระบบใช้คลังปัจจุบันเป็นต้นทางและย้ายสต็อกไปคลังปลายทางทันที"
              : "The current warehouse is the source and stock moves to the destination immediately."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementForm action="transfer" />
        </CardContent>
      </Card>
    </section>
  );
}
