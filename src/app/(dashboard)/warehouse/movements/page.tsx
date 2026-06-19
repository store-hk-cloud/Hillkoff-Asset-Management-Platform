import { notFound } from "next/navigation";

import { MovementList } from "@/features/warehouse/components/movement-list";
import { movementSearchSchema } from "@/features/warehouse/schemas/movement.schema";
import { requireSession } from "@/lib/auth/dal";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const warehouseService = new WarehouseManagementService();

type MovementsPageProps = {
  searchParams: Promise<{ type?: string; success?: string }>;
};

export const metadata = { title: "Movement Logs" };

export default async function MovementsPage({
  searchParams,
}: MovementsPageProps) {
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
        <p className="text-muted-foreground text-sm">Warehouse</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Movement Logs
        </h1>
      </div>
      {params.success ? (
        <p
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          role="status"
        >
          บันทึก Transaction {params.success} สำเร็จ
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
          <option value="all">ทุก Movement</option>
          <option value="received">รับเข้า</option>
          <option value="branch_transfer">โอนสาขา</option>
          <option value="customer_sale">ขายลูกค้า</option>
        </select>
        <button
          className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm font-medium"
          type="submit"
        >
          กรองรายการ
        </button>
      </form>
      <MovementList movements={movements} />
    </section>
  );
}
