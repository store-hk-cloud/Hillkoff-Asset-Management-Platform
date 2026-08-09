import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { MovementList } from "@/features/warehouse/components/movement-list";
import { MovementSearchForm } from "@/features/warehouse/components/movement-search-form";
import { movementSearchSchema } from "@/features/warehouse/schemas/movement.schema";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const warehouseService = new WarehouseManagementService();

type MovementsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export const metadata = { title: "Movement Logs" };

export default async function MovementsPage({
  searchParams,
}: MovementsPageProps) {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!warehouseService.canView(profile)) notFound();

  const params = await searchParams;
  const criteria = movementSearchSchema.parse({
    type: params.type,
    limit: params.limit,
  });
  const movements = await warehouseService.listMovements(
    profile,
    criteria.type,
    criteria.limit,
  );

  return (
    <section className="space-y-6">
      <PageHeader
        description={
          locale === "th"
            ? "ตรวจสอบประวัติการเคลื่อนไหวของเครื่องทั้งหมด"
            : "Review the complete machine movement history."
        }
        eyebrow={t("nav.warehouse")}
        title={t("warehouse.movements")}
      />
      {params.success ? (
        <p
          className="border-[var(--success-line)] bg-[var(--success-bg)] text-success rounded-lg border p-3 text-sm"
          role="status"
        >
          {locale === "th"
            ? `บันทึกธุรกรรม ${params.success} สำเร็จ`
            : `Transaction ${params.success} was recorded successfully`}
        </p>
      ) : null}
      <MovementSearchForm type={criteria.type} />
      {movements.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          {locale === "th"
            ? `แสดง ${movements.length} รายการ`
            : `Showing ${movements.length} results`}
        </p>
      ) : null}
      <MovementList movements={movements} />
      {movements.length === criteria.limit && criteria.limit < 150 ? (
        <div className="flex justify-center">
          <Link
            className="ghost-button rounded-md border px-4 py-2 text-sm"
            href={`/warehouse/movements?type=${criteria.type}&limit=${criteria.limit + 50}`}
          >
            {locale === "th" ? "โหลดเพิ่ม" : "Load more"}
          </Link>
        </div>
      ) : movements.length === criteria.limit ? (
        <p className="text-muted-foreground text-center text-xs">
          {locale === "th"
            ? `แสดงผลสูงสุด ${criteria.limit} รายการแล้ว ลองปรับตัวกรองให้แคบลง`
            : `Showing the first ${criteria.limit} results — narrow your filters to see more.`}
        </p>
      ) : null}
    </section>
  );
}
