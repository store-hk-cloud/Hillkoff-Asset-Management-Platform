import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { applyAuthenticationBoundary } from "@/middleware/auth.middleware";

const CORRELATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("authentication middleware", () => {
  it.each(["/service-jobs", "/service-jobs/job-1", "/technician"])(
    "protects %s before rendering",
    (pathname) => {
      const response = applyAuthenticationBoundary(
        new NextRequest(`https://example.test${pathname}`),
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
      expect(response.headers.get("x-correlation-id")).toMatch(
        CORRELATION_ID_PATTERN,
      );
    },
  );

  it("adds a correlation ID to public requests", () => {
    const response = applyAuthenticationBoundary(
      new NextRequest("https://example.test/login"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toMatch(
      CORRELATION_ID_PATTERN,
    );
  });
});
