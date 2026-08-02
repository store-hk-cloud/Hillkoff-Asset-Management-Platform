import { ArrowRightLeft, History, ShoppingCart } from "lucide-react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { WarehouseActionCard } from "@/features/warehouse/components/warehouse-action-card";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const warehouseService = new WarehouseManagementService();

export const metadata = { title: "Warehouse" };

export default async function WarehousePage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();

  if (
    !warehouseService.canView(profile) &&
    !warehouseService.canSell(profile)
  ) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        description={t("warehouse.description")}
        eyebrow={t("nav.warehouse")}
        title={t("warehouse.title")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {warehouseService.canTransfer(profile) ? (
          <WarehouseActionCard
            description={
              locale === "th"
                ? "ย้ายเครื่องจากคลังปัจจุบันไปคลังปลายทางทันที"
                : "Move a machine directly between warehouses"
            }
            href="/warehouse/transfer"
            icon={<ArrowRightLeft aria-hidden="true" className="size-6" />}
            title={t("warehouse.transfer")}
          />
        ) : null}
        {warehouseService.canSell(profile) ? (
          <WarehouseActionCard
            description={
              locale === "th"
                ? "ขายและส่งมอบเครื่องให้ลูกค้า"
                : "Sell and deliver a machine to a customer"
            }
            href="/warehouse/sale"
            icon={<ShoppingCart aria-hidden="true" className="size-6" />}
            title={t("warehouse.sale")}
          />
        ) : null}
        {warehouseService.canView(profile) ? (
          <WarehouseActionCard
            description={
              locale === "th"
                ? "ตรวจสอบประวัติการเคลื่อนไหวทั้งหมด"
                : "Review the complete machine movement history"
            }
            href="/warehouse/movements"
            icon={<History aria-hidden="true" className="size-6" />}
            title={t("warehouse.movements")}
          />
        ) : null}
      </div>
    </section>
  );
}
