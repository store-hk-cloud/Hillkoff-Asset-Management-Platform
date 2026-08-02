import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { TechnicianAssignmentError } from "@/domain/services/technician-assignment.service";
import { logger } from "@/lib/logging/logger";
import type { TechnicianRequestContext } from "@/services/technician-workspace.service";

export function createTechnicianContext(
  request: Request,
  actor: UserProfile,
): TechnicianRequestContext {
  return {
    actor,
    correlationId: crypto.randomUUID(),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function technicianErrorResponse(
  error: unknown,
  correlationId?: string,
) {
  if (error instanceof TechnicianAssignmentError) {
    const status =
      error.code === "TECHNICIAN_ACCESS_DENIED"
        ? 403
        : error.code === "TECHNICIAN_WORK_NOT_FOUND"
          ? 404
          : error.code === "TECHNICIAN_ASSIGNMENT_CONFLICT"
            ? 409
            : 400;
    logger.warn("Technician request rejected", {
      correlationId,
      code: error.code,
    });
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status },
    );
  }
  logger.error("Unhandled technician request error", error, {
    correlationId,
  });
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "TECHNICIAN_ERROR",
        message: "Technician request failed.",
      },
    },
    { status: 400 },
  );
}
