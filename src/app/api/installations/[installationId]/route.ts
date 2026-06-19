import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/dal";
import { installationErrorResponse } from "@/lib/installation/route-utils";
import { InstallationManagementService } from "@/services/installation-management.service";

const service = new InstallationManagementService();
type Context = { params: Promise<{ installationId: string }> };

export async function GET(_request: Request, context: Context) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { installationId } = await context.params;
    return NextResponse.json({
      success: true,
      data: await service.get(installationId, session.profile),
    });
  } catch (error) {
    return installationErrorResponse(error);
  }
}
