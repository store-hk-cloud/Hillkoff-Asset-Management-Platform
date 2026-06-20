import { NextResponse } from "next/server";

import { transferActionSchema } from "@/features/warehouse/schemas/movement.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import {
  createWarehouseContext,
  warehouseErrorResponse,
} from "@/lib/warehouse/route-utils";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const service = new WarehouseManagementService();

export async function POST(
  request: Request,
  context: { params: Promise<{ transferId: string }> },
) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const input = transferActionSchema.parse(await request.json());
    const { transferId } = await context.params;
    const transfer = await service.returnTransferToSource(
      transferId,
      input.expectedVersion,
      createWarehouseContext(request, session.profile),
    );
    return NextResponse.json({ success: true, data: transfer });
  } catch (error) {
    return warehouseErrorResponse(error);
  }
}
