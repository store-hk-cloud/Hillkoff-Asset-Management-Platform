import QRCode from "qrcode";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/dal";
import { AssetIdentityManagementService } from "@/services/asset-identity-management.service";

const service = new AssetIdentityManagementService();
type RouteContext = { params: Promise<{ assetId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const { assetId } = await context.params;
  const { asset } = await service.get(assetId, session.profile);

  if (!asset.qrUrl) {
    return NextResponse.json(
      { success: false, error: { message: "Public identity is missing." } },
      { status: 409 },
    );
  }

  const format = new URL(request.url).searchParams.get("format");
  const filename = `${asset.assetCode}-qr.${format === "png" ? "png" : "svg"}`;

  if (format === "png") {
    const png = await QRCode.toBuffer(asset.qrUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 1024,
    });
    return new Response(Uint8Array.from(png).buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const svg = await QRCode.toString(asset.qrUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
