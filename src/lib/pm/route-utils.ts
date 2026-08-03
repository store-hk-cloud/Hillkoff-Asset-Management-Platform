import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { AssetError } from "@/domain/errors/asset.error";
import { PmError } from "@/domain/errors/pm.error";
import { getCorrelationId } from "@/lib/http/correlation";
import { logger } from "@/lib/logging/logger";
import type { PmRequestContext } from "@/services/pm-management.service";

export function createPmContext(
  request: Request,
  actor: UserProfile,
): PmRequestContext {
  return {
    actor,
    correlationId: getCorrelationId(request),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function pmErrorResponse(error: unknown, correlationId?: string) {
  if (error instanceof AssetError) {
    logger.warn("PM request rejected", { correlationId, code: error.code });
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.code === "ASSET_NOT_FOUND" ? 404 : 409 },
    );
  }

  if (error instanceof PmError) {
    const status =
      error.code === "PM_ACCESS_DENIED"
        ? 403
        : error.code === "PM_NOT_FOUND" || error.code === "ASSET_NOT_FOUND"
          ? 404
          : error.code === "PM_VERSION_CONFLICT"
            ? 409
            : 400;
    logger.warn("PM request rejected", { correlationId, code: error.code });
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }
  logger.error("Unhandled PM request error", error, { correlationId });
  return NextResponse.json(
    {
      success: false,
      error: { code: "INVALID_PM_REQUEST", message: "Invalid PM request." },
    },
    { status: 400 },
  );
}
