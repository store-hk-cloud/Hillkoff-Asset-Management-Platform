import { NextResponse } from "next/server";

import { scheduleInstallationSchema } from "@/features/installations/schemas/installation.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import {
  createInstallationContext,
  installationErrorResponse,
} from "@/lib/installation/route-utils";
import { InstallationManagementService } from "@/services/installation-management.service";

const service = new InstallationManagementService();

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    return NextResponse.json({
      success: true,
      data: await service.listQueue(session.profile),
    });
  } catch (error) {
    return installationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const input = scheduleInstallationSchema.parse(await request.json());
    const installation = await service.schedule(
      input,
      createInstallationContext(request, session.profile),
    );
    return NextResponse.json(
      { success: true, data: { id: installation.id } },
      { status: 201 },
    );
  } catch (error) {
    return installationErrorResponse(error);
  }
}
