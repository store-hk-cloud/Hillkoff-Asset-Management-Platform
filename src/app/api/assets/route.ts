import { NextResponse } from "next/server";

import {
  assetCreateSchema,
  assetSearchSchema,
} from "@/features/assets/schemas/asset.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { assetErrorResponse } from "@/lib/assets/route-utils";
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

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const correlationId = crypto.randomUUID();
  try {
    const url = new URL(request.url);
    const criteria = assetSearchSchema.parse({
      query: url.searchParams.get("query") ?? "",
      status: url.searchParams.get("status") ?? "active",
      limit: url.searchParams.get("limit") ?? "50",
      categoryKey: url.searchParams.get("categoryKey") ?? "all",
      warehouseId: url.searchParams.get("warehouseId") ?? null,
    });
    const assets = await assetService.list(criteria, session.profile);

    return NextResponse.json(
      { success: true, data: assets },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return assetErrorResponse(error, correlationId);
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

  const requestContext = createContext(request, session.profile);
  try {
    const input = assetCreateSchema.parse(await request.json());
    const asset = await assetService.create(input, requestContext);

    return NextResponse.json(
      { success: true, data: { id: asset.id } },
      { status: 201 },
    );
  } catch (error) {
    return assetErrorResponse(error, requestContext.correlationId);
  }
}
