import { NextResponse } from "next/server";

import { AssetError } from "@/domain/errors/asset.error";
import { getCurrentSession } from "@/lib/auth/dal";
import { AssetManagementService } from "@/services/asset-management.service";

const service = new AssetManagementService();

type RouteContext = {
  params: Promise<{ assetCode: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const { assetCode } = await context.params;
    const catalog = await service.getCatalog(
      decodeURIComponent(assetCode),
      session.profile,
    );

    return NextResponse.json(
      { success: true, data: catalog },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AssetError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: error.code, message: error.message },
        },
        { status: error.code === "ASSET_ACCESS_DENIED" ? 403 : 400 },
      );
    }

    return NextResponse.json({ success: false }, { status: 400 });
  }
}
