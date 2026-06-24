import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "th"
              ? "ย้ายทรัพย์สินระหว่างคลัง"
              : "Move asset between warehouses"}
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
