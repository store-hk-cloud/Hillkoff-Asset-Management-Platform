import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { AssetIdentityError } from "@/domain/errors/asset-identity.error";
import type { IdentityRequestContext } from "@/services/asset-identity-management.service";

export function createIdentityContext(
  request: Request,
  actor: UserProfile,
): IdentityRequestContext {
  return {
    actor,
    correlationId: crypto.randomUUID(),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function identityErrorResponse(error: unknown) {
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
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: { code: "INVALID_NFC_TAG", message: "Invalid NFC request." },
    },
    { status: 400 },
  );
}
