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
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const warehouseService = new WarehouseManagementService();
export const metadata = { title: "ขายลูกค้า" };

export default async function SalePage() {
  const { profile } = await requireSession();
  if (!warehouseService.canSell(profile)) notFound();

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>ขายและส่งมอบให้ลูกค้า</CardTitle>
          <CardDescription>
            เปลี่ยน Custody เป็นลูกค้าและเก็บสาขาผู้ขายใน Movement Log
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementForm action="sale" />
        </CardContent>
      </Card>
    </section>
  );
}
