import { NextResponse } from "next/server";

import { AssetError } from "@/domain/errors/asset.error";
import { assetUpdateSchema } from "@/features/assets/schemas/asset.schema";
import { getCurrentSession } from "@/lib/auth/dal";
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

function errorResponse(error: unknown) {
  if (error instanceof AssetError) {
    const status =
      error.code === "ASSET_ACCESS_DENIED"
        ? 403
        : error.code === "ASSET_NOT_FOUND"
          ? 404
          : error.code.includes("CONFLICT")
            ? 409
            : 400;

    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: { code: "INVALID_ASSET", message: "Invalid asset request." },
    },
    { status: 400 },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const { assetId } = await context.params;
    const asset = await assetService.get(assetId, session.profile);
    return NextResponse.json(
      { success: true, data: asset },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
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

  try {
    const { assetId } = await context.params;
    const input = assetUpdateSchema.parse(await request.json());
    const asset = await assetService.update(
      assetId,
      input,
      createContext(request, session.profile),
    );
    return NextResponse.json({ success: true, data: { id: asset.id } });
  } catch (error) {
    return errorResponse(error);
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

  try {
    const { assetId } = await context.params;
    const asset = await assetService.archive(
      assetId,
      createContext(request, session.profile),
    );
    return NextResponse.json({ success: true, data: { id: asset.id } });
  } catch (error) {
    return errorResponse(error);
  }
}
