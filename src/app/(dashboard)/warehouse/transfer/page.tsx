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
export const metadata = { title: "โอนสาขา" };

export default async function TransferPage() {
  const { profile } = await requireSession();
  if (!warehouseService.canTransfer(profile)) notFound();

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>โอนทรัพย์สินระหว่างสาขา</CardTitle>
          <CardDescription>
            ระบบตรวจสาขาต้นทางและป้องกันการโอนไปสาขาเดิม
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementForm action="transfer" />
        </CardContent>
      </Card>
    </section>
  );
}
