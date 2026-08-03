import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { AssetIdentityError } from "@/domain/errors/asset-identity.error";
import { getCorrelationId } from "@/lib/http/correlation";
import { logger } from "@/lib/logging/logger";
import type { IdentityRequestContext } from "@/services/asset-identity-management.service";

export function createIdentityContext(
  request: Request,
  actor: UserProfile,
): IdentityRequestContext {
  return {
    actor,
    correlationId: getCorrelationId(request),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function identityErrorResponse(error: unknown, correlationId?: string) {
  if (error instanceof AssetIdentityError) {
    const status =
      error.code === "IDENTITY_ACCESS_DENIED"
        ? 403
        : error.code === "ASSET_NOT_FOUND" ||
            error.code === "PUBLIC_ID_NOT_FOUND"
          ? 404
          : error.code === "ASSET_VERSION_CONFLICT"
            ? 409
            : 400;
    logger.warn("Asset identity request rejected", {
      correlationId,
      code: error.code,
    });
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }

  logger.error("Unhandled asset identity request error", error, {
    correlationId,
  });
  return NextResponse.json(
    {
      success: false,
      error: { code: "INVALID_NFC_TAG", message: "Invalid NFC request." },
    },
    { status: 400 },
  );
}
