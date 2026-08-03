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

class ExpiringFeedbackFake implements PublicFeedbackPersistence {
  availableUntil = new Date("2026-08-03T12:00:00.000Z");
  used = false;

  async isAvailable(_hash: string, now: Date) {
    return !this.used && now < this.availableUntil;
  }

  async consume(_hash: string, _feedback: never, now: Date) {
    if (this.used || now >= this.availableUntil) return false;
    this.used = true;
    return true;
  }
}

describe("service-job public feedback contract", () => {
  it("rejects expired tokens and consumes a valid token once", async () => {
    const persistence = new ExpiringFeedbackFake();
    const service = createPublicServiceJobFeedback(
      persistence,
      () => new Date("2026-08-03T11:00:00.000Z"),
    );
    const token = "opaque-token-that-is-at-least-32-chars";
    const payload = {
      serviceScore: 5,
      technicianScore: 5,
      timelinessScore: 4,
      comment: "Great service",
    };

    await expect(service.isAvailable(token)).resolves.toBe(true);
    await expect(service.submit(token, payload)).resolves.toBe(true);
    await expect(service.submit(token, payload)).resolves.toBe(false);
    expect(
      await createPublicServiceJobFeedback(
        persistence,
        () => new Date("2026-08-03T13:00:00.000Z"),
      ).isAvailable(token),
    ).toBe(false);
  });
});
