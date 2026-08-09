import { AlertTriangle, Package } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { InventoryManager } from "@/features/inventory/components/inventory-manager";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { thaiPrimary } from "@/lib/i18n/thai-primary";
import { InventoryManagementService } from "@/services/inventory-management.service";

const service = new InventoryManagementService();

export const metadata = { title: "คลังอะไหล่ / Inventory" };

export default async function InventoryPage() {
  const { locale } = await getServerTranslator();
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
            : thaiPrimary(
                locale,
                "จัดการอะไหล่ ปริมาณคงเหลือ และจุดสั่งซื้อ",
                "Manage spare parts, stock levels, and reorder points.",
              )
        }
        eyebrow={thaiPrimary(locale, "คลังอะไหล่", "Inventory")}
        title={thaiPrimary(locale, "คลังอะไหล่", "Inventory")}
      />

      {lowStock.length > 0 ? (
        <Card className="border-[var(--warning-line)] bg-[var(--warning-bg)]">
          <CardHeader>
            <CardTitle className="text-warning flex items-center gap-2 text-base">
              <AlertTriangle aria-hidden="true" className="size-5" />
              {thaiPrimary(
                locale,
                "แจ้งเตือนอะไหล่ใกล้หมด",
                "Low stock alert",
              )}{" "}
              ({lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="text-warning grid gap-2 text-sm sm:grid-cols-2">
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
          message={thaiPrimary(
            locale,
            "ยังไม่มีรายการอะไหล่",
            "No inventory parts",
          )}
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
                  {thaiPrimary(locale, "จุดสั่งซื้อซ้ำ", "Reorder at")}{" "}
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
