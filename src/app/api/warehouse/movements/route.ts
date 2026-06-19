import { NextResponse } from "next/server";

import { movementSearchSchema } from "@/features/warehouse/schemas/movement.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { warehouseErrorResponse } from "@/lib/warehouse/route-utils";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const warehouseService = new WarehouseManagementService();

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const type = movementSearchSchema.parse({
      type: new URL(request.url).searchParams.get("type") ?? "all",
    }).type;
    const movements = await warehouseService.listMovements(
      session.profile,
      type,
    );
    return NextResponse.json(
      { success: true, data: movements },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return warehouseErrorResponse(error);
  }
}
