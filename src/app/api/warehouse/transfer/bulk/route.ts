import { NextResponse } from "next/server";

import { transferAssetBulkSchema } from "@/features/warehouse/schemas/movement.schema";
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
    const input = transferAssetBulkSchema.parse(await request.json());
    const result = await warehouseService.transferBulk(
      input.assetCodes,
      input.destinationWarehouseId,
      createWarehouseContext(request, session.profile),
      input.referenceNumber,
      input.notes,
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          total: input.assetCodes.length,
          succeeded: result.succeeded.map((m) => ({
            assetCode: m.assetCode,
            movementNumber: m.movementNumber,
          })),
          failed: result.failed,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return warehouseErrorResponse(error);
  }
}