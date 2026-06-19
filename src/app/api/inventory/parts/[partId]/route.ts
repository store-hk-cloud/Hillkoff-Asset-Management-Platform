import { NextResponse } from "next/server";

import { updateInventoryPartSchema } from "@/features/inventory/schemas/inventory.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { inventoryErrorResponse } from "@/lib/inventory/route-utils";
import { InventoryManagementService } from "@/services/inventory-management.service";

const service = new InventoryManagementService();
type Context = { params: Promise<{ partId: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { partId } = await context.params;
    const part = await service.update(
      partId,
      updateInventoryPartSchema.parse(await request.json()),
      session.profile,
    );
    return NextResponse.json({
      success: true,
      data: { id: part.id, version: part.version },
    });
  } catch (error) {
    return inventoryErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { partId } = await context.params;
    const body = (await request.json()) as { expectedVersion?: unknown };
    if (
      typeof body.expectedVersion !== "number" ||
      !Number.isSafeInteger(body.expectedVersion)
    ) {
      return NextResponse.json({ success: false }, { status: 400 });
    }
    const part = await service.deactivate(
      partId,
      body.expectedVersion,
      session.profile,
    );
    return NextResponse.json({
      success: true,
      data: { id: part.id, version: part.version },
    });
  } catch (error) {
    return inventoryErrorResponse(error);
  }
}
