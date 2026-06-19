import { NextResponse } from "next/server";

import { completePmSchema } from "@/features/pm/schemas/pm.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { createPmContext, pmErrorResponse } from "@/lib/pm/route-utils";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();
type Context = { params: Promise<{ pmId: string }> };

export async function POST(request: Request, context: Context) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { pmId } = await context.params;
    const input = completePmSchema.parse(await request.json());
    const job = await service.complete(
      pmId,
      input,
      createPmContext(request, session.profile),
    );
    return NextResponse.json({
      success: true,
      data: { id: job.id, status: job.status, version: job.version },
    });
  } catch (error) {
    return pmErrorResponse(error);
  }
}
