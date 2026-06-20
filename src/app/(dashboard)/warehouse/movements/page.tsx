import { notFound } from "next/navigation";

import { MovementList } from "@/features/warehouse/components/movement-list";
import { movementSearchSchema } from "@/features/warehouse/schemas/movement.schema";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const warehouseService = new WarehouseManagementService();

type MovementsPageProps = {
  searchParams: Promise<{ type?: string; success?: string }>;
};

export const metadata = { title: "Movement Logs" };

export default async function MovementsPage({
  searchParams,
}: MovementsPageProps) {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!warehouseService.canView(profile)) notFound();

  const params = await searchParams;
  const type = movementSearchSchema.parse({
    type: params.type ?? "all",
  }).type;
  const movements = await warehouseService.listMovements(profile, type);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">{t("warehouse.title")}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("warehouse.movements")}
        </h1>
      </div>
      {params.success ? (
        <p
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          role="status"
        >
          {locale === "th"
            ? `บันทึกธุรกรรม ${params.success} สำเร็จ`
            : `Transaction ${params.success} was recorded successfully`}
        </p>
      ) : null}
      <form
        action="/warehouse/movements"
        className="flex flex-col gap-3 sm:flex-row"
        method="get"
      >
        <select
          className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          defaultValue={type}
          name="type"
        >
          <option value="all">
            {locale === "th" ? "ทุกการเคลื่อนไหว" : "All movements"}
          </option>
          <option value="received">{t("warehouse.receive")}</option>
          <option value="branch_transfer">{t("warehouse.transfer")}</option>
          <option value="customer_sale">{t("warehouse.sale")}</option>
        </select>
        <button
          className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm font-medium"
          type="submit"
        >
          {locale === "th" ? "กรองรายการ" : "Apply filter"}
        </button>
      </form>
      <MovementList movements={movements} />
    </section>
  );
}
