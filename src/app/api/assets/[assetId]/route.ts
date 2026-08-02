import { NextResponse } from "next/server";

import { assetUpdateSchema } from "@/features/assets/schemas/asset.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { assetErrorResponse } from "@/lib/assets/route-utils";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { AssetManagementService } from "@/services/asset-management.service";

const assetService = new AssetManagementService();

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

function createContext(
  request: Request,
  profile: NonNullable<
    Awaited<ReturnType<typeof getCurrentSession>>
  >["profile"],
) {
  return {
    actor: profile,
    correlationId: crypto.randomUUID(),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const correlationId = crypto.randomUUID();
  try {
    const { assetId } = await context.params;
    const asset = await assetService.get(assetId, session.profile);
    return NextResponse.json(
      { success: true, data: asset },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return assetErrorResponse(error, correlationId);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const requestContext = createContext(request, session.profile);
  try {
    const { assetId } = await context.params;
    const input = assetUpdateSchema.parse(await request.json());
    const asset = await assetService.update(assetId, input, requestContext);
    return NextResponse.json({ success: true, data: { id: asset.id } });
  } catch (error) {
    return assetErrorResponse(error, requestContext.correlationId);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const requestContext = createContext(request, session.profile);
  try {
    const { assetId } = await context.params;
    const asset = await assetService.archive(assetId, requestContext);
    return NextResponse.json({ success: true, data: { id: asset.id } });
  } catch (error) {
    return assetErrorResponse(error, requestContext.correlationId);
  }
}
