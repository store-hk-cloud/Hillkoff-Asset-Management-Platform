import { NextResponse } from "next/server";

import { ASSET_EVENT_TYPES } from "@/domain/entities/asset-event";
import { getCurrentSession } from "@/lib/auth/dal";
import { AssetManagementService } from "@/services/asset-management.service";

const assetService = new AssetManagementService();

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

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
}
