import { AlertTriangle, Package } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { InventoryManager } from "@/features/inventory/components/inventory-manager";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { InventoryManagementService } from "@/services/inventory-management.service";

const service = new InventoryManagementService();

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();
  const parts = await service.list(profile);
  const lowStock = parts.filter(
    (part) => part.active && part.quantityOnHand <= part.reorderPoint,
  );

  return (
    <section className="space-y-6">
      <PageHeader
        description={
          locale === "th"
            ? "จัดการอะไหล่ ปริมาณคงเหลือ และจุดสั่งซื้อ"
            : "Manage spare parts, stock levels, and reorder points."
        }
        eyebrow={t("nav.inventory")}
        title={t("inventory.title")}
      />

      {lowStock.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-900">
              <AlertTriangle aria-hidden="true" className="size-5" />
              {locale === "th" ? "แจ้งเตือนอะไหล่ใกล้หมด" : "Low Stock Alert"} (
              {lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-amber-900 sm:grid-cols-2">
            {lowStock.map((part) => (
              <p key={part.id}>
                {part.partNumber} · {part.name}: {part.quantityOnHand}{" "}
                {part.unit}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <InventoryManager canWrite={service.canWrite(profile)} parts={parts} />

      {parts.length === 0 ? (
        <EmptyState
          icon={Package}
          message={
            locale === "th" ? "ยังไม่มีรายการอะไหล่" : "No inventory parts"
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {parts.map((part) => (
            <Card key={part.id}>
              <CardHeader>
                <CardTitle className="text-base">{part.name}</CardTitle>
                <p className="text-muted-foreground font-mono text-xs">
                  {part.partNumber}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-2xl font-semibold">
                  {part.quantityOnHand.toLocaleString("th-TH")} {part.unit}
                </p>
                <p className="text-muted-foreground">
                  {locale === "th" ? "จุดสั่งซื้อซ้ำ" : "Reorder at"}{" "}
                  {part.reorderPoint.toLocaleString(
                    locale === "th" ? "th-TH" : "en-US",
                  )}
                </p>
                <p className="text-muted-foreground">
                  {part.unitCost.toLocaleString("th-TH")} THB / {part.unit}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
