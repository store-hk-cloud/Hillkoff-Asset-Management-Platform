import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { RepairError } from "@/domain/errors/repair.error";
import type { RepairRequestContext } from "@/services/repair-management.service";

export function createRepairContext(
  request: Request,
  actor: UserProfile,
): RepairRequestContext {
  return {
    actor,
    correlationId: crypto.randomUUID(),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function repairErrorResponse(error: unknown) {
  if (error instanceof RepairError) {
    const status =
      error.code === "REPAIR_ACCESS_DENIED"
        ? 403
        : error.code === "REPAIR_NOT_FOUND" || error.code === "ASSET_NOT_FOUND"
          ? 404
          : error.code === "REPAIR_VERSION_CONFLICT"
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
        code: "INVALID_REPAIR_REQUEST",
        message: "Invalid repair request.",
      },
    },
    { status: 400 },
  );
}
