import "server-only";

import { NextResponse } from "next/server";

import { AssetError } from "@/domain/errors/asset.error";
import { logger } from "@/lib/logging/logger";

export function assetErrorResponse(error: unknown, correlationId?: string) {
  if (error instanceof AssetError) {
    const status =
      error.code === "ASSET_ACCESS_DENIED"
        ? 403
        : error.code === "ASSET_NOT_FOUND"
          ? 404
          : error.code.includes("CONFLICT") ||
              error.code === "ASSET_REFERENCE_AMBIGUOUS"
            ? 409
            : 400;

    logger.warn("Asset request rejected", { correlationId, code: error.code });
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }

  logger.error("Unhandled asset request error", error, { correlationId });
  return NextResponse.json(
    {
      success: false,
      error: { code: "INVALID_ASSET", message: "Invalid asset request." },
    },
    { status: 400 },
  );
}
