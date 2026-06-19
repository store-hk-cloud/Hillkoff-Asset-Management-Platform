import { NextResponse } from "next/server";

import { identityErrorResponse } from "@/lib/asset-identity/route-utils";
import { AssetIdentityManagementService } from "@/services/asset-identity-management.service";

const service = new AssetIdentityManagementService();
type RouteContext = { params: Promise<{ publicId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { publicId } = await context.params;
    const asset = await service.lookupPublic(publicId);
    return NextResponse.json(
      { success: true, data: asset },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    return identityErrorResponse(error);
  }
}
