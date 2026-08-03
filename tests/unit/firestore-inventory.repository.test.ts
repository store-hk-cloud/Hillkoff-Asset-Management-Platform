import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { mapInventoryMovementReferenceType } from "@/repositories/firestore/firestore-inventory.repository";

describe("FirestoreInventoryRepository movement mapper", () => {
  it("preserves a persisted service_job reference", () => {
    expect(mapInventoryMovementReferenceType("service_job")).toBe(
      "service_job",
    );
  });

  it("preserves existing manual and repair references and rejects unknown values", () => {
    expect(mapInventoryMovementReferenceType("manual")).toBe("manual");
    expect(mapInventoryMovementReferenceType("repair")).toBe("repair");
    expect(() => mapInventoryMovementReferenceType("other")).toThrowError(
      "Invalid inventory movement reference type.",
    );
  });
});
