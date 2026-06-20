import "server-only";

import { NextResponse } from "next/server";

import type { UserProfile } from "@/domain/entities/user-profile";
import { TechnicianAssignmentError } from "@/domain/services/technician-assignment.service";
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

export function technicianErrorResponse(error: unknown) {
  if (error instanceof TechnicianAssignmentError) {
    const status =
      error.code === "TECHNICIAN_ACCESS_DENIED"
        ? 403
        : error.code === "TECHNICIAN_WORK_NOT_FOUND"
          ? 404
          : error.code === "TECHNICIAN_ASSIGNMENT_CONFLICT"
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
        code: "TECHNICIAN_ERROR",
        message: "Technician request failed.",
      },
    },
    { status: 400 },
  );
}
