import {
  ArrowRightLeft,
  History,
  PackageCheck,
  ShoppingCart,
} from "lucide-react";
import { notFound } from "next/navigation";

import { WarehouseActionCard } from "@/features/warehouse/components/warehouse-action-card";
import { requireSession } from "@/lib/auth/dal";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const warehouseService = new WarehouseManagementService();

export const metadata = { title: "Warehouse" };

export default async function WarehousePage() {
  const { profile } = await requireSession();

  if (
    !warehouseService.canView(profile) &&
    !warehouseService.canSell(profile)
  ) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">Operations</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Warehouse
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          รับเข้า โอนสาขา และขายลูกค้า พร้อม Transaction Log ครบถ้วน
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {warehouseService.canReceive(profile) ? (
          <WarehouseActionCard
            description="รับทรัพย์สินเข้าคลังหรือสาขาปลายทาง"
            href="/warehouse/receive"
            icon={<PackageCheck aria-hidden="true" className="size-6" />}
            title="รับเข้า"
          />
        ) : null}
        {warehouseService.canTransfer(profile) ? (
          <WarehouseActionCard
            description="โอนทรัพย์สินระหว่างสาขา"
            href="/warehouse/transfer"
            icon={<ArrowRightLeft aria-hidden="true" className="size-6" />}
            title="โอนสาขา"
          />
        ) : null}
        {warehouseService.canSell(profile) ? (
          <WarehouseActionCard
            description="ขายและส่งมอบทรัพย์สินให้ลูกค้า"
            href="/warehouse/sale"
            icon={<ShoppingCart aria-hidden="true" className="size-6" />}
            title="ขายลูกค้า"
          />
        ) : null}
        {warehouseService.canView(profile) ? (
          <WarehouseActionCard
            description="ตรวจสอบประวัติการเคลื่อนไหวทั้งหมด"
            href="/warehouse/movements"
            icon={<History aria-hidden="true" className="size-6" />}
            title="Movement Logs"
          />
        ) : null}
      </div>
    </section>
  );
}
