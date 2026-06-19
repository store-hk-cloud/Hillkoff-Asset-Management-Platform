import "server-only";

import { NextResponse } from "next/server";

import { InventoryError } from "@/domain/errors/inventory.error";

export function inventoryErrorResponse(error: unknown) {
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
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }
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
