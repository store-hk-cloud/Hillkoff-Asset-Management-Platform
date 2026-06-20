import { NextResponse } from "next/server";

import { transferAssetSchema } from "@/features/warehouse/schemas/movement.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import {
  createWarehouseContext,
  warehouseErrorResponse,
} from "@/lib/warehouse/route-utils";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const warehouseService = new WarehouseManagementService();

export async function POST(request: Request) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const input = transferAssetSchema.parse(await request.json());
    const movement = await warehouseService.transfer(
      input,
      createWarehouseContext(request, session.profile),
    );
    return NextResponse.json(
      {
        success: true,
        data: {
          id: movement.id,
          movementNumber: movement.transferNumber,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return warehouseErrorResponse(error);
  }
}
