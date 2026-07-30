import { NextResponse } from "next/server";

import { ASSET_EVENT_TYPES } from "@/domain/entities/asset-event";
import { AssetError } from "@/domain/errors/asset.error";
import { getCurrentSession } from "@/lib/auth/dal";
import { AssetManagementService } from "@/services/asset-management.service";

const assetService = new AssetManagementService();

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

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

export async function GET(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const { assetId } = await context.params;
    const requestedTypes = new URL(request.url).searchParams
      .getAll("type")
      .filter((type) =>
        ASSET_EVENT_TYPES.some((eventType) => eventType === type),
      ) as (typeof ASSET_EVENT_TYPES)[number][];
    const events = await assetService.listEvents(
      assetId,
      session.profile,
      requestedTypes.length > 0 ? requestedTypes : undefined,
    );

    return NextResponse.json(
      { success: true, data: events },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
