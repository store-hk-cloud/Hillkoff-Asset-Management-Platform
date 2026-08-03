import { describe, expect, it } from "vitest";
import { assertOnlineOnlyAction } from "@/features/service-jobs/services/service-job-offline.service";
import { validateServiceJobUpload } from "@/features/service-jobs/services/service-job-storage.service";

describe("service-job offline boundaries", () => {
  it("keeps irreversible actions online-only", () => {
    expect(() => assertOnlineOnlyAction("handoff", false)).toThrow(
      /อินเทอร์เน็ต/,
    );
    expect(() => assertOnlineOnlyAction("handoff", true)).not.toThrow();
  });
  it("validates evidence storage metadata", () => {
    expect(
      validateServiceJobUpload(
        { name: "a.jpg", size: 10, type: "image/jpeg" } as File,
        "service-jobs/job-1/evidence/a.jpg",
      ),
    ).toBe(true);
    expect(() =>
      validateServiceJobUpload(
        { name: "a.exe", size: 10, type: "application/octet-stream" } as File,
        "service-jobs/job-1/evidence/a.exe",
      ),
    ).toThrow();
    expect(() =>
      validateServiceJobUpload(
        { name: "a.jpg", size: 10, type: "image/jpeg" } as File,
        "service-jobs/job-2/../evidence/a.jpg",
      ),
    ).toThrow();
  });
});
