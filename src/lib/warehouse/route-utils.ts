import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { WarehouseError } from "@/domain/errors/warehouse.error";
import type { WarehouseRequestContext } from "@/services/warehouse-management.service";

export function createWarehouseContext(
  request: Request,
  actor: UserProfile,
): WarehouseRequestContext {
  return {
    actor,
    correlationId: crypto.randomUUID(),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function warehouseErrorResponse(error: unknown) {
  if (error instanceof WarehouseError) {
    const status =
      error.code === "WAREHOUSE_ACCESS_DENIED"
        ? 403
        : error.code === "ASSET_NOT_FOUND"
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
      error: {
        code: "INVALID_MOVEMENT",
        message: "Invalid warehouse transaction.",
      },
    },
    { status: 400 },
  );
}
