import { getCurrentSession } from "@/lib/auth/dal";
import { buildAssetExportCsv } from "@/lib/exports/asset-export";
import { AssetManagementService } from "@/services/asset-management.service";
import { WarehouseManagementService } from "@/services/warehouse-management.service";
import type { MovementLog } from "@/domain/entities/movement-log";

const assetService = new AssetManagementService();
const warehouseService = new WarehouseManagementService();

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const assets = await assetService.list(
    { query: "", status: "all", categoryKey: "all", warehouseId: null, limit: 10000 },
    session.profile,
  );

  let movements: readonly MovementLog[] = [];
  try {
    movements = await warehouseService.listMovements(
      session.profile,
      "all",
      5000,
    );
  } catch {
    // Role cannot view movement history (e.g. customer) -- export the
    // asset details without the last-movement columns instead of failing.
  }

  const csv = buildAssetExportCsv(assets, movements);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hillkoff-assets.csv"',
      "Cache-Control": "no-store",
    },
  });
}
