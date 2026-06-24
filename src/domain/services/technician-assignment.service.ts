import { DomainError } from "@/domain/errors/domain-error";
import type {
  TechnicianAssignmentStatus,
  TechnicianWorkType,
} from "@/domain/entities/technician-work";

export class TechnicianAssignmentError extends DomainError {
  constructor(
    readonly code:
      | "TECHNICIAN_ACCESS_DENIED"
      | "TECHNICIAN_WORK_NOT_FOUND"
      | "TECHNICIAN_ASSIGNMENT_CONFLICT"
      | "TECHNICIAN_INVALID_ASSIGNMENT",
    message: string,
  ) {
    super(message);
  }
}

export class TechnicianAssignmentService {
  respond(
    current: TechnicianAssignmentStatus,
    action: "accept" | "reject",
    reason: string,
  ): {
    status: TechnicianAssignmentStatus;
    rejectionReason: string | null;
  } {
    if (current !== "pending") {
      throw new TechnicianAssignmentError(
        "TECHNICIAN_ASSIGNMENT_CONFLICT",
        "This assignment has already been answered.",
      );
    }
    if (action === "reject" && !reason.trim()) {
      throw new TechnicianAssignmentError(
        "TECHNICIAN_INVALID_ASSIGNMENT",
        "A rejection reason is required.",
      );
    }
    return {
      status: action === "accept" ? "accepted" : "rejected",
      rejectionReason: action === "reject" ? reason.trim() : null,
    };
  }

  workHref(type: TechnicianWorkType, id: string): string {
    return type === "repair"
      ? `/repairs/${id}`
      : type === "pm"
        ? `/pm/${id}`
        : `/installations/${id}`;
  }
}
