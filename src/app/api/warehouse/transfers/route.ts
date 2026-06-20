import { NextResponse } from "next/server";

import { transferSearchSchema } from "@/features/warehouse/schemas/movement.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { warehouseErrorResponse } from "@/lib/warehouse/route-utils";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const service = new WarehouseManagementService();

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { status } = transferSearchSchema.parse({
      status: new URL(request.url).searchParams.get("status") ?? "open",
    });
    return NextResponse.json({
      success: true,
      data: await service.listTransfers(session.profile, status),
    });
  } catch (error) {
    return warehouseErrorResponse(error);
  }
}
