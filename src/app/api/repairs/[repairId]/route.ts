import { NextResponse } from "next/server";

import { updateRepairSchema } from "@/features/repairs/schemas/repair.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import {
  createRepairContext,
  repairErrorResponse,
} from "@/lib/repair/route-utils";
import { RepairManagementService } from "@/services/repair-management.service";

const service = new RepairManagementService();
type Context = { params: Promise<{ repairId: string }> };

export async function GET(_request: Request, context: Context) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { repairId } = await context.params;
    return NextResponse.json({
      success: true,
      data: await service.get(repairId, session.profile),
    });
  } catch (error) {
    return repairErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { repairId } = await context.params;
    const input = updateRepairSchema.parse(await request.json());
    const now = new Date();
    const ticket = await service.update(
      repairId,
      {
        ...input,
        photos: input.photos.map((photo) => ({
          ...photo,
          uploadedAt: now,
          uploadedBy: session.profile.uid,
        })),
      },
      createRepairContext(request, session.profile),
    );
    return NextResponse.json({
      success: true,
      data: {
        id: ticket.id,
        status: ticket.status,
        version: ticket.version,
      },
    });
  } catch (error) {
    return repairErrorResponse(error);
  }
}
