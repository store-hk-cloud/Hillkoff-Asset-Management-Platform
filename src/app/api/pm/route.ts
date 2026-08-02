import { NextResponse } from "next/server";

import { schedulePmSchema } from "@/features/pm/schemas/pm.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { createPmContext, pmErrorResponse } from "@/lib/pm/route-utils";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date query parameter.");
  }
  return parsed;
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const correlationId = crypto.randomUUID();
  try {
    const params = new URL(request.url).searchParams;
    const status =
      params.get("status") === "completed"
        ? "completed"
        : params.get("status") === "all"
          ? "all"
          : "scheduled";
    const from = parseDateParam(params.get("from"));
    const to = parseDateParam(params.get("to"));
    return NextResponse.json({
      success: true,
      data: await service.list(session.profile, {
        status,
        from,
        to,
      }),
    });
  } catch (error) {
    return pmErrorResponse(error, correlationId);
  }
}

export async function POST(request: Request) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const context = createPmContext(request, session.profile);
  try {
    const input = schedulePmSchema.parse(await request.json());
    const job = await service.schedule(input, context);
    return NextResponse.json(
      { success: true, data: { id: job.id } },
      { status: 201 },
    );
  } catch (error) {
    return pmErrorResponse(error, context.correlationId);
  }
}
