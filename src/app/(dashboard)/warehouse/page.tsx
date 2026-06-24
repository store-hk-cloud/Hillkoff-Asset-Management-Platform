import { ArrowRightLeft, History, ShoppingCart } from "lucide-react";
import { notFound } from "next/navigation";

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
      <div>
        <p className="text-muted-foreground text-sm">{t("nav.warehouse")}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("warehouse.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("warehouse.description")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {warehouseService.canTransfer(profile) ? (
          <WarehouseActionCard
            description={
              locale === "th"
                ? "ย้ายทรัพย์สินจากคลังปัจจุบันไปคลังปลายทางทันที"
                : "Move an asset directly between warehouses"
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
                ? "ขายและส่งมอบทรัพย์สินให้ลูกค้า"
                : "Sell and deliver an asset to a customer"
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
                : "Review the complete asset movement history"
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
