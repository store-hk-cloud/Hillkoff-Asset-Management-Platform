import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/dal";
import { identityErrorResponse } from "@/lib/asset-identity/route-utils";
import { AssetIdentityManagementService } from "@/services/asset-identity-management.service";

const service = new AssetIdentityManagementService();

type RouteContext = { params: Promise<{ assetId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const { assetId } = await context.params;
    const result = await service.get(assetId, session.profile);
    return NextResponse.json(
      { success: true, data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return identityErrorResponse(error);
  }
}
