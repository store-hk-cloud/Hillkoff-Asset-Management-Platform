import { AlertTriangle, Package } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { InventoryManager } from "@/features/inventory/components/inventory-manager";
import { InventorySearchForm } from "@/features/inventory/components/inventory-search-form";
import { inventorySearchSchema } from "@/features/inventory/schemas/inventory.schema";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { thaiPrimary } from "@/lib/i18n/thai-primary";
import { InventoryManagementService } from "@/services/inventory-management.service";

const service = new InventoryManagementService();

export const metadata = { title: "คลังอะไหล่ / Inventory" };

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function InventoryPage({ searchParams }: Props) {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();
  const params = await searchParams;
  const criteria = inventorySearchSchema.parse({
    status: params.status,
    query: params.query,
    limit: params.limit,
  });

  const allParts = await service.list(profile);
  const lowStockCount = allParts.filter(
    (part) => part.active && part.quantityOnHand <= part.reorderPoint,
  ).length;

  const normalizedQuery = criteria.query.toLocaleLowerCase(
    locale === "th" ? "th-TH" : "en-US",
  );
  const filtered = allParts.filter((part) => {
    if (criteria.status === "active" && !part.active) return false;
    if (criteria.status === "inactive" && part.active) return false;
    if (
      criteria.status === "low" &&
      !(part.active && part.quantityOnHand <= part.reorderPoint)
    ) {
      return false;
    }
    if (!normalizedQuery) return true;
    return (
      part.partNumber.toLocaleLowerCase().includes(normalizedQuery) ||
      part.name.toLocaleLowerCase().includes(normalizedQuery)
    );
  });
  const parts = filtered.slice(0, criteria.limit);

  return (
    <section className="space-y-6">
      <PageHeader
        description={thaiPrimary(
          locale,
          "จัดการอะไหล่ ปริมาณคงเหลือ และจุดสั่งซื้อ",
          "Manage spare parts, stock levels, and reorder points.",
        )}
        eyebrow={thaiPrimary(locale, "คลังอะไหล่", "Inventory")}
        title={thaiPrimary(locale, "คลังอะไหล่", "Inventory")}
      />

      {lowStockCount > 0 && criteria.status !== "low" ? (
        <Link href="/inventory?status=low">
          <Card className="border-[var(--warning-line)] bg-[var(--warning-bg)] hover:opacity-90">
            <CardHeader>
              <CardTitle className="text-warning flex items-center gap-2 text-base">
                <AlertTriangle aria-hidden="true" className="size-5" />
                {thaiPrimary(
                  locale,
                  "แจ้งเตือนอะไหล่ใกล้หมด",
                  "Low stock alert",
                )}{" "}
                ({lowStockCount})
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
      ) : null}

      <InventorySearchForm query={criteria.query} status={criteria.status} />

      <InventoryManager canWrite={service.canWrite(profile)} parts={allParts} />

      {parts.length === 0 ? (
        <EmptyState
          icon={Package}
          message={thaiPrimary(
            locale,
            "ไม่พบอะไหล่ตามตัวกรอง",
            "No inventory parts match these filters.",
          )}
        />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {thaiPrimary(
              locale,
              `แสดง ${parts.length} จาก ${filtered.length} รายการ`,
              `Showing ${parts.length} of ${filtered.length} results`,
            )}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {parts.map((part) => (
              <Card key={part.id}>
                <CardHeader>
                  <CardTitle className="text-base">{part.name}</CardTitle>
                  <p className="text-muted-foreground font-mono text-xs">
                    {part.partNumber}
                  </p>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="text-2xl font-semibold">
                    {part.quantityOnHand.toLocaleString("th-TH")} {part.unit}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {thaiPrimary(locale, "จุดสั่งซื้อซ้ำ", "Reorder at")}{" "}
                    {part.reorderPoint.toLocaleString(
                      locale === "th" ? "th-TH" : "en-US",
                    )}{" "}
                    · {part.unitCost.toLocaleString("th-TH")} THB/{part.unit}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {filtered.length > criteria.limit && criteria.limit < 200 ? (
            <div className="flex justify-center">
              <Link
                className="ghost-button rounded-md border px-4 py-2 text-sm"
                href={`/inventory?status=${criteria.status}&query=${encodeURIComponent(criteria.query)}&limit=${criteria.limit + 50}`}
              >
                {thaiPrimary(locale, "โหลดเพิ่ม", "Load more")}
              </Link>
            </div>
          ) : filtered.length > criteria.limit ? (
            <p className="text-muted-foreground text-center text-xs">
              {thaiPrimary(
                locale,
                `แสดงผลสูงสุด ${criteria.limit} รายการแล้ว ลองปรับตัวกรองให้แคบลง`,
                `Showing the first ${criteria.limit} results — narrow your filters to see more.`,
              )}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
