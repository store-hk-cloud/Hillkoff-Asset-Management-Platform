import { describe, expect, it } from "vitest";

import {
  TECHNICIAN_WORK_TYPES,
  type TechnicianWorkType,
} from "@/domain/entities/technician-work";

describe("technician service-job compatibility", () => {
  it("adds service jobs without removing legacy work types", () => {
    expect(TECHNICIAN_WORK_TYPES).toEqual([
      "repair",
      "pm",
      "installation",
      "service_job",
    ] satisfies readonly TechnicianWorkType[]);
  });
});
