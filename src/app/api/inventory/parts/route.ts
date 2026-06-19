import { NextResponse } from "next/server";

import { inventoryPartSchema } from "@/features/inventory/schemas/inventory.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { inventoryErrorResponse } from "@/lib/inventory/route-utils";
import { InventoryManagementService } from "@/services/inventory-management.service";

const service = new InventoryManagementService();

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    return NextResponse.json({
      success: true,
      data: await service.list(session.profile),
    });
  } catch (error) {
    return inventoryErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const part = await service.create(
      inventoryPartSchema.parse(await request.json()),
      session.profile,
    );
    return NextResponse.json(
      { success: true, data: { id: part.id } },
      { status: 201 },
    );
  } catch (error) {
    return inventoryErrorResponse(error);
  }
}
