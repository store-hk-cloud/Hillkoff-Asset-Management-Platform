import QRCode from "qrcode";
import sharp from "sharp";
import { NextResponse } from "next/server";

import { AssetError } from "@/domain/errors/asset.error";
import { getCurrentSession } from "@/lib/auth/dal";
import { AssetIdentityManagementService } from "@/services/asset-identity-management.service";

const service = new AssetIdentityManagementService();
type RouteContext = { params: Promise<{ assetId: string }> };

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
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const { assetId } = await context.params;
  let asset;
  try {
    ({ asset } = await service.get(assetId, session.profile));
  } catch (error) {
    return errorResponse(error);
  }

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
  const codeGraphic = renderBitmapText(assetCode, {
    x: 16,
    y: 118,
    scale: 8,
  });
  const serialGraphic = renderBitmapText(serialNumber || "-", {
    x: 16,
    y: 224,
    scale: 8,
  });
  const labelTextSvg = `
    <svg width="${width - 390}" height="${height}" viewBox="0 0 ${width - 390} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${codeGraphic}
      ${serialGraphic}
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

const BITMAP_FONT: Readonly<Record<string, readonly string[]>> = {
  "0": ["111", "101", "101", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "010", "010", "111"],
  "2": ["111", "001", "001", "111", "100", "100", "111"],
  "3": ["111", "001", "001", "111", "001", "001", "111"],
  "4": ["101", "101", "101", "111", "001", "001", "001"],
  "5": ["111", "100", "100", "111", "001", "001", "111"],
  "6": ["111", "100", "100", "111", "101", "101", "111"],
  "7": ["111", "001", "001", "010", "010", "010", "010"],
  "8": ["111", "101", "101", "111", "101", "101", "111"],
  "9": ["111", "101", "101", "111", "001", "001", "111"],
  A: ["010", "101", "101", "111", "101", "101", "101"],
  B: ["110", "101", "101", "110", "101", "101", "110"],
  C: ["111", "100", "100", "100", "100", "100", "111"],
  D: ["110", "101", "101", "101", "101", "101", "110"],
  E: ["111", "100", "100", "110", "100", "100", "111"],
  F: ["111", "100", "100", "110", "100", "100", "100"],
  G: ["111", "100", "100", "101", "101", "101", "111"],
  H: ["101", "101", "101", "111", "101", "101", "101"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
  J: ["001", "001", "001", "001", "101", "101", "111"],
  K: ["101", "101", "110", "100", "110", "101", "101"],
  L: ["100", "100", "100", "100", "100", "100", "111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["1001", "1101", "1011", "1001", "1001", "1001", "1001"],
  O: ["111", "101", "101", "101", "101", "101", "111"],
  P: ["111", "101", "101", "111", "100", "100", "100"],
  Q: ["111", "101", "101", "101", "101", "111", "001"],
  R: ["111", "101", "101", "111", "110", "101", "101"],
  S: ["111", "100", "100", "111", "001", "001", "111"],
  T: ["111", "010", "010", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "101", "101", "010"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["101", "101", "101", "010", "101", "101", "101"],
  Y: ["101", "101", "101", "010", "010", "010", "010"],
  Z: ["111", "001", "001", "010", "100", "100", "111"],
  "-": ["000", "000", "000", "111", "000", "000", "000"],
  "/": ["001", "001", "010", "010", "010", "100", "100"],
  ".": ["000", "000", "000", "000", "000", "110", "110"],
  " ": ["000", "000", "000", "000", "000", "000", "000"],
};

function renderBitmapText(
  value: string,
  options: Readonly<{ x: number; y: number; scale: number }>,
): string {
  let cursorX = options.x;
  const rects: string[] = [];

  for (const character of value.toUpperCase()) {
    const glyph = BITMAP_FONT[character] ?? BITMAP_FONT["-"]!;
    const glyphWidth = glyph[0]!.length;

    glyph.forEach((row, rowIndex) => {
      Array.from(row).forEach((pixel, columnIndex) => {
        if (pixel !== "1") return;
        rects.push(
          `<rect x="${cursorX + columnIndex * options.scale}" y="${options.y + rowIndex * options.scale}" width="${options.scale}" height="${options.scale}" fill="#111827"/>`,
        );
      });
    });

    cursorX += (glyphWidth + 1) * options.scale;
  }

  return rects.join("");
}
