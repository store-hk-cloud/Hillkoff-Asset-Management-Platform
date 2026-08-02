import "server-only";

import { NextResponse } from "next/server";

import { InventoryError } from "@/domain/errors/inventory.error";
import { logger } from "@/lib/logging/logger";

export function inventoryErrorResponse(error: unknown, correlationId?: string) {
  if (error instanceof InventoryError) {
    const status =
      error.code === "INVENTORY_ACCESS_DENIED"
        ? 403
        : error.code === "PART_NOT_FOUND"
          ? 404
          : error.code === "PART_VERSION_CONFLICT" ||
              error.code === "PART_NUMBER_CONFLICT"
            ? 409
            : 400;
    logger.warn("Inventory request rejected", {
      correlationId,
      code: error.code,
    });
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }
  logger.error("Unhandled inventory request error", error, { correlationId });
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INVALID_INVENTORY_REQUEST",
        message: "Invalid inventory request.",
      },
    },
    { status: 400 },
  );
}
