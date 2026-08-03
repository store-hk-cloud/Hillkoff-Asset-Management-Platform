import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { AssetError } from "@/domain/errors/asset.error";
import { InstallationError } from "@/domain/errors/installation.error";
import { getCorrelationId } from "@/lib/http/correlation";
import { logger } from "@/lib/logging/logger";
import type { InstallationRequestContext } from "@/services/installation-management.service";

export function createInstallationContext(
  request: Request,
  actor: UserProfile,
): InstallationRequestContext {
  return {
    actor,
    correlationId: getCorrelationId(request),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function installationErrorResponse(
  error: unknown,
  correlationId?: string,
) {
  if (error instanceof AssetError) {
    logger.warn("Installation request rejected", {
      correlationId,
      code: error.code,
    });
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.code === "ASSET_NOT_FOUND" ? 404 : 409 },
    );
  }

  if (error instanceof InstallationError) {
    const status =
      error.code === "INSTALLATION_ACCESS_DENIED"
        ? 403
        : error.code === "INSTALLATION_NOT_FOUND" ||
            error.code === "ASSET_NOT_FOUND"
          ? 404
          : error.code === "INSTALLATION_VERSION_CONFLICT"
            ? 409
            : 400;
    logger.warn("Installation request rejected", {
      correlationId,
      code: error.code,
    });
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }
  logger.error("Unhandled installation request error", error, {
    correlationId,
  });
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INVALID_INSTALLATION",
        message: "Invalid installation request.",
      },
    },
    { status: 400 },
  );
}
