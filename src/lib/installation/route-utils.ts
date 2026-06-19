import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { InstallationError } from "@/domain/errors/installation.error";
import type { InstallationRequestContext } from "@/services/installation-management.service";

export function createInstallationContext(
  request: Request,
  actor: UserProfile,
): InstallationRequestContext {
  return {
    actor,
    correlationId: crypto.randomUUID(),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function installationErrorResponse(error: unknown) {
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
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }
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
