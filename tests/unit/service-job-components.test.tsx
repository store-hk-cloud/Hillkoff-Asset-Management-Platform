import { describe, expect, it } from "vitest";

import { serviceJobStatusTone } from "@/features/service-jobs/components/service-job-status-badge";

describe("service-job dashboard components", () => {
  it("maps lifecycle states to the shared status-badge tones", () => {
    expect(serviceJobStatusTone("completed")).toBe("success");
    expect(serviceJobStatusTone("waiting_parts")).toBe("warning");
    expect(serviceJobStatusTone("cancelled")).toBe("danger");
    expect(serviceJobStatusTone("assigned")).toBe("info");
  });
});
