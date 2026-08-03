import { describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

// @ts-expect-error Vitest supports virtual modules at runtime.
vi.mock("server-only", () => ({}), { virtual: true });

import { createUserId } from "@/domain/value-objects/user-id";
import { FirestoreTechnicianRepository } from "@/repositories/firestore/firestore-technician.repository";

type Stored = Record<string, unknown>;

class FakeReference {
  constructor(
    readonly firestore: FakeFirestore,
    readonly path: string,
  ) {}

  get id() {
    return this.path.split("/").at(-1) ?? "";
  }

  collection(name: string) {
    return new FakeQuery(this.firestore, `${this.path}/${name}`);
  }

  async get() {
    return new FakeSnapshot(this, this.firestore.documents.get(this.path));
  }
}

class FakeSnapshot {
  constructor(
    readonly ref: FakeReference,
    private readonly value: Stored | undefined,
  ) {}

  get exists() {
    return this.value !== undefined;
  }

  data() {
    return this.value;
  }

  get id() {
    return this.ref.id;
  }
}

class FakeQuery {
  private filters: Array<{ field: string; value: unknown }> = [];
  private maximum: number | null = null;

  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string,
  ) {}

  where(field: string, _operator: string, value: unknown) {
    this.filters.push({ field, value });
    return this;
  }

  limit(value: number) {
    this.maximum = value;
    return this;
  }

  async get() {
    const docs = [...this.firestore.documents.entries()]
      .filter(([path, value]) => {
        const parent = path.split("/").slice(0, -1).join("/");
        if (parent !== this.path) return false;
        return this.filters.every(({ field, value: expected }) => {
          const actual = value[field];
          return Array.isArray(actual)
            ? actual.includes(expected)
            : actual === expected;
        });
      })
      .slice(0, this.maximum ?? Number.POSITIVE_INFINITY)
      .map(
        ([path, value]) =>
          new FakeSnapshot(new FakeReference(this.firestore, path), value),
      );
    return { docs };
  }
}

class FakeFirestore {
  readonly documents = new Map<string, Stored>();

  collection(name: string) {
    return new FakeQuery(this, name);
  }
}

describe("FirestoreTechnicianRepository service jobs", () => {
  it("finds array-assigned jobs and preserves the child assignment state", async () => {
    const firestore = new FakeFirestore();
    firestore.documents.set("service_jobs/job-1", {
      jobNumber: "SJ-0001",
      assignedTechnicianIds: ["tech-1"],
      leadTechnicianId: "tech-1",
      asset: { assetId: "asset-1", assetCode: "A-001", model: "Model X" },
      title: "On-site repair",
      status: "assigned",
      version: 3,
      scheduledStartAt: Timestamp.fromDate(new Date("2026-08-03T08:00:00Z")),
    });
    firestore.documents.set("service_jobs/job-1/assignments/assignment-1", {
      technicianId: "tech-1",
      technicianName: "Field technician",
      status: "pending",
      role: "lead",
    });

    const repository = new FirestoreTechnicianRepository(firestore as never);
    const technicianId = createUserId("tech-1");
    const work = await repository.listWork(technicianId, 20);
    const assetWork = await repository.findWorkByAsset(technicianId, "asset-1");

    expect(work).toHaveLength(1);
    expect(work[0]).toMatchObject({
      id: "job-1",
      assignmentId: "assignment-1",
      assignmentStatus: "pending",
      assignedTechnicianId: technicianId,
      href: "/service-jobs/job-1",
    });
    expect(assetWork).toHaveLength(1);
    expect(assetWork[0]?.assignmentId).toBe("assignment-1");
  });
});
