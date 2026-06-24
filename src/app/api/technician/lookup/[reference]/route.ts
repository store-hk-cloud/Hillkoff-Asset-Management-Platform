import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/dal";
import { technicianErrorResponse } from "@/lib/technician/route-utils";
import { TechnicianWorkspaceService } from "@/services/technician-workspace.service";

const service = new TechnicianWorkspaceService();

export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string }> },
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { reference } = await context.params;
    return NextResponse.json({
      success: true,
      data: await service.lookup(
        decodeURIComponent(reference),
        session.profile,
      ),
    });
  } catch (error) {
    return technicianErrorResponse(error);
  }
}
