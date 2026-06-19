import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { PmError } from "@/domain/errors/pm.error";
import type { PmRequestContext } from "@/services/pm-management.service";

export function createPmContext(
  request: Request,
  actor: UserProfile,
): PmRequestContext {
  return {
    actor,
    correlationId: crypto.randomUUID(),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function pmErrorResponse(error: unknown) {
  if (error instanceof PmError) {
    const status =
      error.code === "PM_ACCESS_DENIED"
        ? 403
        : error.code === "PM_NOT_FOUND" || error.code === "ASSET_NOT_FOUND"
          ? 404
          : error.code === "PM_VERSION_CONFLICT"
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
      error: { code: "INVALID_PM_REQUEST", message: "Invalid PM request." },
    },
    { status: 400 },
  );
}
