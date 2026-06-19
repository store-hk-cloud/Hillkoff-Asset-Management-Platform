import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/dal";
import { warehouseErrorResponse } from "@/lib/warehouse/route-utils";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const warehouseService = new WarehouseManagementService();

type RouteContext = {
  params: Promise<{ assetCode: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const { assetCode } = await context.params;
    const asset = await warehouseService.findAssetByCode(
      decodeURIComponent(assetCode),
      session.profile,
    );
    return NextResponse.json(
      { success: true, data: asset },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return warehouseErrorResponse(error);
  }
}
