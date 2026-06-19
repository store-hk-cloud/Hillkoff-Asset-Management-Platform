import { NextResponse } from "next/server";

import { createRepairSchema } from "@/features/repairs/schemas/repair.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import {
  createRepairContext,
  repairErrorResponse,
} from "@/lib/repair/route-utils";
import { RepairManagementService } from "@/services/repair-management.service";

const service = new RepairManagementService();

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    return NextResponse.json({
      success: true,
      data: await service.list(session.profile),
    });
  } catch (error) {
    return repairErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const input = createRepairSchema.parse(await request.json());
    const ticket = await service.create(
      input,
      createRepairContext(request, session.profile),
    );
    return NextResponse.json(
      { success: true, data: { id: ticket.id } },
      { status: 201 },
    );
  } catch (error) {
    return repairErrorResponse(error);
  }
}
