import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { logger } from "@/lib/logging/logger";

describe("structured logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts sensitive context before writing JSON", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("authentication event", {
      password: "do-not-log",
      nested: { accessToken: "also-do-not-log", operation: "login" },
      correlationId: "correlation-id",
    });

    expect(output).toHaveBeenCalledOnce();
    const line = output.mock.calls[0]?.[0];
    expect(line).toContain('"password":"[REDACTED]"');
    expect(line).toContain('"accessToken":"[REDACTED]"');
    expect(line).not.toContain("do-not-log");
    expect(line).not.toContain("also-do-not-log");
  });
});
