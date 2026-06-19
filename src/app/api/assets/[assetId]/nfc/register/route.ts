import { NextResponse } from "next/server";

import { nfcRegistrationSchema } from "@/features/asset-identity/schemas/identity.schema";
import {
  identityErrorResponse,
  createIdentityContext,
} from "@/lib/asset-identity/route-utils";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { AssetIdentityManagementService } from "@/services/asset-identity-management.service";

const service = new AssetIdentityManagementService();
type RouteContext = { params: Promise<{ assetId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const { assetId } = await context.params;
    const { tagType } = nfcRegistrationSchema.parse(await request.json());
    const registration = await service.register(
      assetId,
      tagType,
      createIdentityContext(request, session.profile),
    );
    return NextResponse.json({
      success: true,
      data: { status: registration.status },
    });
  } catch (error) {
    return identityErrorResponse(error);
  }
}
