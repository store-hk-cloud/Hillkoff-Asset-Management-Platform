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
export const metadata = { title: "รับเข้าทรัพย์สิน" };

export default async function ReceivePage() {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!warehouseService.canReceive(profile)) notFound();

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "th" ? "รับเข้าทรัพย์สิน" : "Receive asset"}
          </CardTitle>
          <CardDescription>
            {locale === "th"
              ? "อัปเดต Asset และสร้าง Movement, Asset Event และ Audit Log พร้อมกัน"
              : "Updates the asset and creates the Movement, Asset Event, and Audit Log atomically."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementForm action="receive" />
        </CardContent>
      </Card>
    </section>
  );
}
