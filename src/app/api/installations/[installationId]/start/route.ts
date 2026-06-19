import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import {
  createInstallationContext,
  installationErrorResponse,
} from "@/lib/installation/route-utils";
import { InstallationManagementService } from "@/services/installation-management.service";

const service = new InstallationManagementService();
type Context = { params: Promise<{ installationId: string }> };

export async function POST(request: Request, context: Context) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { installationId } = await context.params;
    const installation = await service.start(
      installationId,
      createInstallationContext(request, session.profile),
    );
    return NextResponse.json({
      success: true,
      data: { id: installation.id, version: installation.version },
    });
  } catch (error) {
    return installationErrorResponse(error);
  }
}
