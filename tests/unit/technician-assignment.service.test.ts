import { describe, expect, it } from "vitest";

import {
  TechnicianAssignmentError,
  TechnicianAssignmentService,
} from "@/domain/services/technician-assignment.service";

const service = new TechnicianAssignmentService();

describe("TechnicianAssignmentService", () => {
  it("accepts a pending assignment", () => {
    expect(service.respond("pending", "accept", "")).toEqual({
      status: "accepted",
      rejectionReason: null,
    });
  });

  it("requires a reason when rejecting", () => {
    expect(() => service.respond("pending", "reject", " ")).toThrowError(
      TechnicianAssignmentError,
    );
    expect(service.respond("pending", "reject", "Schedule conflict")).toEqual({
      status: "rejected",
      rejectionReason: "Schedule conflict",
    });
  });

  it("prevents answering an assignment twice", () => {
    expect(() => service.respond("accepted", "reject", "Changed mind")).toThrow(
      TechnicianAssignmentError,
    );
  });
});
