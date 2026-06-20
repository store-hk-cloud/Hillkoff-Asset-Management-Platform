import { AssetTransferList } from "@/features/warehouse/components/asset-transfer-list";
import { transferSearchSchema } from "@/features/warehouse/schemas/movement.schema";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const service = new WarehouseManagementService();

export const metadata = { title: "Asset Transfers" };

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  const params = await searchParams;
  const { status } = transferSearchSchema.parse({
    status: params.status ?? "open",
  });
  const transfers = await service.listTransfers(profile, status);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          {locale === "th" ? "คลังและสาขา" : "Warehouse"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {locale === "th" ? "รายการโอนระหว่างสาขา" : "Branch transfers"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {locale === "th"
            ? "ต้นทางยืนยันส่งก่อน และปลายทางต้องสแกนเครื่องเพื่อรับเข้าสต็อก"
            : "The source dispatches first; the destination scans the asset before receiving stock."}
        </p>
      </div>
      <form className="flex gap-2" method="get">
        <select
          className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          defaultValue={status}
          name="status"
        >
          <option value="open">
            {locale === "th" ? "รายการที่ยังไม่จบ" : "Open"}
          </option>
          <option value="pending_dispatch">
            {locale === "th" ? "รอส่ง" : "Pending dispatch"}
          </option>
          <option value="in_transit">
            {locale === "th" ? "กำลังขนส่ง" : "In transit"}
          </option>
          <option value="all">{locale === "th" ? "ทั้งหมด" : "All"}</option>
        </select>
        <button className="bg-primary text-primary-foreground rounded-md px-4 text-sm">
          {locale === "th" ? "แสดง" : "Apply"}
        </button>
      </form>
      <AssetTransferList
        branchId={profile.branchId}
        role={profile.role}
        transfers={transfers}
      />
    </section>
  );
}
