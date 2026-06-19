import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/dal";
import { pmErrorResponse } from "@/lib/pm/route-utils";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();
type Context = { params: Promise<{ pmId: string }> };

export async function GET(_request: Request, context: Context) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { pmId } = await context.params;
    return NextResponse.json({
      success: true,
      data: await service.get(pmId, session.profile),
    });
  } catch (error) {
    return pmErrorResponse(error);
  }
}
