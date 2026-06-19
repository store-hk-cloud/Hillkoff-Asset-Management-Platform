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
export const metadata = { title: "รับเข้าทรัพย์สิน" };

export default async function ReceivePage() {
  const { profile } = await requireSession();
  if (!warehouseService.canReceive(profile)) notFound();

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>รับเข้าทรัพย์สิน</CardTitle>
          <CardDescription>
            อัปเดต Asset และสร้าง Movement, Asset Event และ Audit Log พร้อมกัน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementForm action="receive" />
        </CardContent>
      </Card>
    </section>
  );
}
