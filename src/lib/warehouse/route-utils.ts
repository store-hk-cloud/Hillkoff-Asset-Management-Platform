import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { AssetError } from "@/domain/errors/asset.error";
import { WarehouseError } from "@/domain/errors/warehouse.error";
import { getCorrelationId } from "@/lib/http/correlation";
import { logger } from "@/lib/logging/logger";
import type { WarehouseRequestContext } from "@/services/warehouse-management.service";

export function createWarehouseContext(
  request: Request,
  actor: UserProfile,
): WarehouseRequestContext {
  return {
    actor,
    correlationId: getCorrelationId(request),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function warehouseErrorResponse(error: unknown, correlationId?: string) {
  if (error instanceof AssetError) {
    logger.warn("Warehouse request rejected", {
      correlationId,
      code: error.code,
    });
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.code === "ASSET_NOT_FOUND" ? 404 : 409 },
    );
  }

  if (error instanceof WarehouseError) {
    const status =
      error.code === "WAREHOUSE_ACCESS_DENIED"
        ? 403
        : error.code === "ASSET_NOT_FOUND"
          ? 404
          : error.code === "ASSET_VERSION_CONFLICT" ||
              error.code === "SAME_BRANCH_TRANSFER" ||
              error.code === "ASSET_ALREADY_SOLD"
            ? 409
            : 400;

    logger.warn("Warehouse request rejected", {
      correlationId,
      code: error.code,
    });
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }

  logger.error("Unhandled warehouse request error", error, { correlationId });
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
