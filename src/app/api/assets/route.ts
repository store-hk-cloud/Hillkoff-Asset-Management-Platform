import { NextResponse } from "next/server";

import { AssetError } from "@/domain/errors/asset.error";
import {
  assetCreateSchema,
  assetSearchSchema,
} from "@/features/assets/schemas/asset.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { AssetManagementService } from "@/services/asset-management.service";

const assetService = new AssetManagementService();

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

function assetErrorResponse(error: unknown) {
  if (error instanceof AssetError) {
    const status =
      error.code === "ASSET_ACCESS_DENIED"
        ? 403
        : error.code === "ASSET_CODE_CONFLICT" ||
            error.code === "ASSET_SERIAL_CONFLICT" ||
            error.code === "ASSET_REFERENCE_AMBIGUOUS" ||
            error.code === "ASSET_VERSION_CONFLICT"
          ? 409
          : error.code === "ASSET_NOT_FOUND"
            ? 404
            : 400;

    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: { code: "INVALID_ASSET", message: "Invalid asset data." },
    },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const criteria = assetSearchSchema.parse({
      query: url.searchParams.get("query") ?? "",
      status: url.searchParams.get("status") ?? "active",
      limit: url.searchParams.get("limit") ?? "50",
      categoryKey: url.searchParams.get("categoryKey") ?? "all",
    });
    const assets = await assetService.list(criteria, session.profile);

    return NextResponse.json(
      { success: true, data: assets },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return assetErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const input = assetCreateSchema.parse(await request.json());
    const asset = await assetService.create(
      input,
      createContext(request, session.profile),
    );

    return NextResponse.json(
      { success: true, data: { id: asset.id } },
      { status: 201 },
    );
  } catch (error) {
    return assetErrorResponse(error);
  }
}
