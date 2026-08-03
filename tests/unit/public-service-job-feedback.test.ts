import { describe, expect, it, vi } from "vitest";

import {
  createPublicServiceJobFeedback,
  type PublicFeedbackPersistence,
} from "@/lib/service-jobs/service";

// @ts-expect-error Vitest supports virtual modules at runtime.
vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/firebase/admin-firestore", () => ({
  getFirebaseAdminFirestore: () => ({}),
}));

class SingleUseFeedbackFake implements PublicFeedbackPersistence {
  private available = true;
  readonly hashes: string[] = [];

  async isAvailable(tokenHash: string): Promise<boolean> {
    this.hashes.push(tokenHash);
    return this.available;
  }

  async consume(tokenHash: string): Promise<boolean> {
    this.hashes.push(tokenHash);
    if (!this.available) return false;
    this.available = false;
    return true;
  }
}

describe("public service-job feedback", () => {
  it("uses a cryptographic token hash for rate-limit and persistence keys", async () => {
    const persistence = new SingleUseFeedbackFake();
    const service = createPublicServiceJobFeedback(
      persistence,
      () => new Date("2026-08-02T12:00:00.000Z"),
    );
    const token = "opaque-token-that-is-at-least-32-chars";

    const readKey = service.rateLimitKey(token, "read");
    const writeKey = service.rateLimitKey(token, "write");
    await service.isAvailable(token);

    expect(readKey).toMatch(/^service-feedback:read:[a-f0-9]{64}$/);
    expect(writeKey).toMatch(/^service-feedback:write:[a-f0-9]{64}$/);
    expect(readKey).not.toContain(token);
    expect(persistence.hashes[0]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("allows exactly one feedback submission through an atomic persistence dependency", async () => {
    const persistence = new SingleUseFeedbackFake();
    const service = createPublicServiceJobFeedback(persistence);
    const token = "opaque-token-that-is-at-least-32-chars";
    const feedback = {
      serviceScore: 5,
      technicianScore: 4,
      timelinessScore: 5,
      comment: "Good service",
    };

    await expect(service.submit(token, feedback)).resolves.toBe(true);
    await expect(service.submit(token, feedback)).resolves.toBe(false);
    await expect(service.isAvailable(token)).resolves.toBe(false);
    expect(new Set(persistence.hashes).size).toBe(1);
  });
});
