import { NextResponse } from "next/server";

import {
  technicianResponseSchema,
  technicianWorkTypeSchema,
} from "@/features/technician/schemas/technician.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import {
  createTechnicianContext,
  technicianErrorResponse,
} from "@/lib/technician/route-utils";
import { TechnicianWorkspaceService } from "@/services/technician-workspace.service";

const service = new TechnicianWorkspaceService();

export async function POST(
  request: Request,
  context: { params: Promise<{ type: string; workId: string }> },
) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  const requestContext = createTechnicianContext(request, session.profile);
  try {
    const { type, workId } = await context.params;
    const result = await service.respond(
      technicianWorkTypeSchema.parse(type),
      workId,
      technicianResponseSchema.parse(await request.json()),
      requestContext,
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return technicianErrorResponse(error, requestContext.correlationId);
  }
}
