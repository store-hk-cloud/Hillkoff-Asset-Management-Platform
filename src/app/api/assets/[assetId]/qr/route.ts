import QRCode from "qrcode";
import sharp from "sharp";
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
  const filename =
    format === "print"
      ? `${asset.assetCode}-qr-print.png`
      : `${asset.assetCode}-qr.${format === "png" ? "png" : "svg"}`;

  if (format === "print") {
    const qrPng = await QRCode.toBuffer(asset.qrUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 520,
    });
    const labelPng = await createPrintableQrLabel(
      qrPng,
      asset.assetCode,
      asset.serialNumber ?? "",
    );

    return new Response(Uint8Array.from(labelPng).buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

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
        "X-Content-Type-Options": "nosniff",
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

async function createPrintableQrLabel(
  qrPng: Buffer,
  assetCode: string,
  serialNumber: string,
): Promise<Buffer> {
  const width = 900;
  const height = 420;
  const qrSize = 330;
  const labelTextSvg = `
    <svg width="${width - 390}" height="${height}" viewBox="0 0 ${width - 390} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        text {
          fill: #111827;
          font-family: Consolas, "Liberation Mono", Menlo, monospace;
          font-size: 46px;
          font-weight: 600;
          letter-spacing: 0;
        }
      </style>
      <text x="16" y="168">${escapeXml(assetCode)}</text>
      <text x="16" y="264">${escapeXml(serialNumber || "-")}</text>
    </svg>`;

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(qrPng).resize(qrSize, qrSize).png().toBuffer(),
        left: 40,
        top: Math.round((height - qrSize) / 2),
      },
      {
        input: Buffer.from(labelTextSvg),
        left: 390,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return character;
    }
  });
}
