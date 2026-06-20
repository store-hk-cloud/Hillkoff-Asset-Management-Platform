import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { UserManagementError } from "@/domain/errors/user-management.error";
import type { UserManagementRequestContext } from "@/services/user-management.service";

export function createUserManagementContext(
  request: Request,
  actor: UserProfile,
): UserManagementRequestContext {
  return {
    actor,
    correlationId: crypto.randomUUID(),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function userManagementErrorResponse(error: unknown) {
  if (error instanceof UserManagementError) {
    const status =
      error.code === "USER_ACCESS_DENIED" ||
      error.code === "SELF_MANAGEMENT_DENIED"
        ? 403
        : error.code === "USER_NOT_FOUND"
          ? 404
          : error.code === "USER_EMAIL_CONFLICT" ||
              error.code === "USER_VERSION_CONFLICT"
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
      error: { code: "INVALID_USER", message: "Invalid user data." },
    },
    { status: 400 },
  );
}
