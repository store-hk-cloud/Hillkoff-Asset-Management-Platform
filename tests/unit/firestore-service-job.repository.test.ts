import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  ServiceJob,
  ServiceJobAssessment,
} from "@/domain/entities/service-job";
import type { ServiceJobRecord } from "@/domain/repositories/service-job.repository";
import {
  formatServiceJobDocumentNumber,
  serviceJobDocumentNumberReservationId,
} from "@/domain/repositories/service-job.repository";
import {
  FirestoreServiceJobRepository,
  mapPersistedBillingDocument,
  mapPersistedServiceJobAssessment,
  mapPersistedServiceJobEvent,
  mapPersistedServiceJobIdempotency,
  mapPersistedServiceJobListItem,
  serializeServiceJobRecord,
} from "@/repositories/firestore/firestore-service-job.repository";
import { createUserId } from "@/domain/value-objects/user-id";

type StoredDocument = Record<string, unknown>;
type Stage =
  | { kind: "create"; path: string; data: StoredDocument }
  | {
      kind: "set";
      path: string;
      data: StoredDocument;
      merge: boolean;
    }
  | { kind: "update"; path: string; data: StoredDocument }
  | { kind: "delete"; path: string };

class FakeDocumentReference {
  constructor(
    readonly firestore: FakeFirestore,
    readonly path: string,
  ) {}

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

  collection(name: string): FakeCollectionReference {
    return new FakeCollectionReference(this.firestore, `${this.path}/${name}`);
  }
}

class FakeQuery {
  constructor(
    readonly firestore: FakeFirestore,
    readonly path: string,
    readonly orderField: string | null = null,
    readonly orderDirection: "asc" | "desc" = "asc",
    readonly maximum: number | null = null,
  ) {}

  orderBy(field: string, direction: "asc" | "desc" = "asc"): FakeQuery {
    return new FakeQuery(
      this.firestore,
      this.path,
      field,
      direction,
      this.maximum,
    );
  }

  limit(maximum: number): FakeQuery {
    return new FakeQuery(
      this.firestore,
      this.path,
      this.orderField,
      this.orderDirection,
      maximum,
    );
  }
}

class FakeCollectionReference extends FakeQuery {
  doc(id = `auto-${this.firestore.nextId++}`): FakeDocumentReference {
    return new FakeDocumentReference(this.firestore, `${this.path}/${id}`);
  }
}

class FakeDocumentSnapshot {
  constructor(
    readonly ref: FakeDocumentReference,
    private readonly stored: StoredDocument | undefined,
  ) {}

  get exists(): boolean {
    return this.stored !== undefined;
  }

  data(): StoredDocument | undefined {
    return this.stored;
  }

  get(field: string): unknown {
    return this.stored?.[field];
  }

  get id(): string {
    return this.ref.id;
  }
}

function sortable(value: unknown): number | string {
  if (value instanceof Timestamp) return value.toMillis();
  return typeof value === "number" ? value : String(value ?? "");
}

class FakeTransaction {
  readonly stages: Stage[] = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(
    target: FakeDocumentReference | FakeQuery,
  ): Promise<FakeDocumentSnapshot | { docs: FakeDocumentSnapshot[] }> {
    this.firestore.log.push(`read:${target.path}`);
    if (target instanceof FakeDocumentReference) {
      return new FakeDocumentSnapshot(
        target,
        this.firestore.documents.get(target.path),
      );
    }
    const prefix = `${target.path}/`;
    let entries = [...this.firestore.documents.entries()].filter(
      ([path]) =>
        path.startsWith(prefix) && !path.slice(prefix.length).includes("/"),
    );
    if (target.orderField) {
      entries.sort(([, left], [, right]) => {
        const leftValue = sortable(left[target.orderField!]);
        const rightValue = sortable(right[target.orderField!]);
        const compared =
          leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
        return target.orderDirection === "desc" ? -compared : compared;
      });
    }
    if (target.maximum !== null) entries = entries.slice(0, target.maximum);
    return {
      docs: entries.map(
        ([path, data]) =>
          new FakeDocumentSnapshot(
            new FakeDocumentReference(this.firestore, path),
            data,
          ),
      ),
    };
  }

  create(reference: FakeDocumentReference, data: StoredDocument): void {
    this.firestore.log.push(`stage:create:${reference.path}`);
    this.stages.push({
      kind: "create",
      path: reference.path,
      data: structuredClone(data),
    });
  }

  set(
    reference: FakeDocumentReference,
    data: StoredDocument,
    options?: { merge?: boolean },
  ): void {
    this.firestore.log.push(`stage:set:${reference.path}`);
    this.stages.push({
      kind: "set",
      path: reference.path,
      data: structuredClone(data),
      merge: options?.merge === true,
    });
  }

  update(reference: FakeDocumentReference, data: StoredDocument): void {
    this.firestore.log.push(`stage:update:${reference.path}`);
    this.stages.push({
      kind: "update",
      path: reference.path,
      data: structuredClone(data),
    });
  }

  delete(reference: FakeDocumentReference): void {
    this.firestore.log.push(`stage:delete:${reference.path}`);
    this.stages.push({ kind: "delete", path: reference.path });
  }

  commit(): void {
    const candidate = structuredClone(this.firestore.documents);
    for (const stage of this.stages) {
      if (stage.kind === "create") {
        if (candidate.has(stage.path)) throw new Error("ALREADY_EXISTS");
        candidate.set(stage.path, stage.data);
      } else if (stage.kind === "set") {
        candidate.set(
          stage.path,
          stage.merge
            ? { ...(candidate.get(stage.path) ?? {}), ...stage.data }
            : stage.data,
        );
      } else if (stage.kind === "update") {
        if (!candidate.has(stage.path)) throw new Error("NOT_FOUND");
        candidate.set(stage.path, {
          ...candidate.get(stage.path),
          ...stage.data,
        });
      } else {
        candidate.delete(stage.path);
      }
    }
    this.firestore.documents = candidate;
    this.firestore.log.push("commit");
  }
}

class FakeFirestore {
  documents = new Map<string, StoredDocument>();
  readonly log: string[] = [];
  nextId = 1;
  retryAttempts = 1;

  collection(name: string): FakeCollectionReference {
    return new FakeCollectionReference(this, name);
  }

  async runTransaction<T>(
    work: (transaction: FakeTransaction) => Promise<T>,
  ): Promise<T> {
    let result!: T;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt += 1) {
      const transaction = new FakeTransaction(this);
      result = await work(transaction);
      if (attempt < this.retryAttempts) {
        this.log.push("retry");
      } else {
        transaction.commit();
      }
    }
    return result;
  }
}

const now = new Date("2026-08-02T09:00:00.000Z");
const timestamp = Timestamp.fromDate(now);

function line(overrides: StoredDocument = {}): StoredDocument {
  return {
    id: "line-1",
    code: "SERVICE",
    type: "service",
    description: "Repair service",
    unit: "job",
    quantity: 1,
    unitPriceSatang: 200_000,
    discountBasisPoints: 0,
    discountReason: null,
    warehouseId: null,
    warrantyMonths: 0,
    ...overrides,
  };
}

const policy = {
  kind: "out_of_warranty" as const,
  vatBasisPoints: 700,
  withholdingBasisPoints: 300,
  depositBasisPoints: 0,
};

const totals = {
  serviceSubtotalSatang: 200_000,
  partsSubtotalSatang: 0,
  subtotalSatang: 200_000,
  discountSatang: 0,
  taxableAmountSatang: 200_000,
  vatSatang: 14_000,
  withholdingSatang: 6_000,
  depositSatang: 0,
  totalDueSatang: 208_000,
};

function persistedAssessment(overrides: StoredDocument = {}): StoredDocument {
  return {
    id: "assessment-1",
    jobId: "job-1",
    revision: 1,
    evaluatorId: "technician-1",
    status: "draft",
    lines: [line()],
    policy,
    totals,
    approvedAt: null,
    approvedBy: null,
    createdAt: timestamp,
    createdBy: "technician-1",
    ...overrides,
  };
}

const customer = {
  customerId: "customer-1",
  name: "Customer One",
  taxId: null,
  group: null,
  billingAddress: "Bangkok",
  serviceAddress: "Bangkok",
  primaryPhone: "020000000",
  secondaryPhone: null,
};

const contact = {
  name: "Contact One",
  phone: "020000000",
  extension: null,
  email: null,
};

const asset = {
  assetId: "asset-1",
  assetCode: "A-1",
  serialNumber: "SN-1",
  equipmentType: "Grinder",
  brand: "Hillkoff",
  model: "G1",
  warrantyStatus: "unknown",
  warrantyExpiresAt: null,
  repeatRepair: false,
  previousRepairNumber: null,
  includedAccessories: [],
  observedDefects: [],
  additionalRequirements: "",
};

function persistedBilling(overrides: StoredDocument = {}): StoredDocument {
  return {
    id: "document-1",
    jobId: "job-1",
    assessmentId: "assessment-1",
    documentNumber: "INV-2569-HQ-ABCDEF123456-000001",
    kind: "invoice",
    status: "issued",
    customer,
    contact,
    asset,
    lines: [line()],
    policy,
    totals,
    issuedAt: timestamp,
    issuedBy: "admin-1",
    voidedAt: null,
    voidReason: null,
    issueDate: timestamp,
    dueDate: timestamp,
    paymentTerms: "Due now",
    department: "Service",
    salesperson: "Sales",
    emergencyOverrideReason: null,
    ...overrides,
  };
}

function jobEntity(): ServiceJob {
  const actor = createUserId("admin-1");
  return {
    id: "job-1",
    jobNumber: "SVC-0001",
    schemaVersion: 1,
    workType: "repair",
    fulfillmentMode: "carry_in",
    title: "Repair grinder",
    description: "Noise",
    customer,
    contact,
    asset: { ...asset, warrantyStatus: "unknown" },
    status: "assessment_pending",
    scheduledStartAt: now,
    assignments: [],
    assignedTechnicianIds: [],
    leadTechnicianId: null,
    evidence: [],
    rootCause: "",
    solution: "",
    completedAt: null,
    approvedAssessmentId: null,
    handedOffAt: null,
    handoffSignature: null,
    handoffOverrideReason: null,
    termsAcceptedAt: now,
    termsAcceptedBy: "Customer One",
    createdAt: now,
    createdBy: actor,
    updatedAt: now,
    updatedBy: actor,
    version: 2,
  };
}

function record(): ServiceJobRecord {
  return {
    job: jobEntity(),
    warehouseId: "warehouse-1",
    execution: {
      checkIn: null,
      checkOut: null,
      checklist: [],
      partsConsumed: [],
      serviceActions: [],
      completionNotes: "",
      deliveryNotes: "",
    },
  };
}

function repository(firestore: FakeFirestore): FirestoreServiceJobRepository {
  return new FirestoreServiceJobRepository(
    firestore as unknown as ConstructorParameters<
      typeof FirestoreServiceJobRepository
    >[0],
  );
}

describe("Firestore service-job financial mappers", () => {
  it("accepts exact assessment and billing snapshots with immutable policy", () => {
    expect(
      mapPersistedServiceJobAssessment(
        persistedAssessment(),
        "job-1",
        "assessment-1",
      ).totals,
    ).toEqual(totals);
    expect(
      mapPersistedBillingDocument(persistedBilling(), "job-1", "document-1")
        .policy,
    ).toEqual(policy);
  });

  it("requires a recognized immutable business charge-policy kind", () => {
    expect(
      mapPersistedServiceJobAssessment(
        persistedAssessment(),
        "job-1",
        "assessment-1",
      ).policy.kind,
    ).toBe("out_of_warranty");
    expect(() =>
      mapPersistedServiceJobAssessment(
        persistedAssessment({ policy: { ...policy, kind: "unknown" } }),
        "job-1",
        "assessment-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
  });

  it("enforces coherent persisted assessment and billing statuses", () => {
    expect(() =>
      mapPersistedServiceJobAssessment(
        persistedAssessment({ status: "approved" }),
        "job-1",
        "assessment-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
    expect(() =>
      mapPersistedServiceJobAssessment(
        persistedAssessment({
          status: "superseded",
          approvedAt: timestamp,
          approvedBy: null,
        }),
        "job-1",
        "assessment-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
    expect(() =>
      mapPersistedServiceJobAssessment(
        persistedAssessment({
          status: "draft",
          approvedAt: timestamp,
          approvedBy: "admin-1",
        }),
        "job-1",
        "assessment-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
    expect(() =>
      mapPersistedBillingDocument(
        persistedBilling({ status: "void" }),
        "job-1",
        "document-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
    expect(
      mapPersistedBillingDocument(
        persistedBilling({
          status: "void",
          voidedAt: timestamp,
          voidReason: "Duplicate document",
        }),
        "job-1",
        "document-1",
      ).status,
    ).toBe("void");
    expect(() =>
      mapPersistedBillingDocument(
        persistedBilling({
          status: "issued",
          voidedAt: timestamp,
          voidReason: "Duplicate",
        }),
        "job-1",
        "document-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
  });

  it("rejects a list item whose embedded identity differs from its document path", () => {
    const data = serializeServiceJobRecord(record());
    expect(() => mapPersistedServiceJobListItem(data, "job-2")).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
    expect(mapPersistedServiceJobListItem(data, "job-1").id).toBe("job-1");
  });

  it.each([
    [
      "too many lines",
      {
        lines: Array.from({ length: 101 }, (_, index) =>
          line({ id: `line-${index}` }),
        ),
      },
    ],
    ["zero quantity", { lines: [line({ quantity: 0 })] }],
    ["negative money", { lines: [line({ unitPriceSatang: -1 })] }],
    ["invalid basis points", { policy: { ...policy, vatBasisPoints: 10_001 } }],
    [
      "unexplained full discount",
      {
        lines: [line({ discountBasisPoints: 10_000 })],
        totals: {
          ...totals,
          discountSatang: 200_000,
          taxableAmountSatang: 0,
          vatSatang: 0,
          withholdingSatang: 0,
          totalDueSatang: 0,
        },
      },
    ],
    ["mismatched totals", { totals: { ...totals, totalDueSatang: 1 } }],
  ])("rejects malformed assessment financial data: %s", (_name, overrides) => {
    expect(() =>
      mapPersistedServiceJobAssessment(
        persistedAssessment(overrides),
        "job-1",
        "assessment-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
  });

  it("rejects billing without a policy snapshot or with malformed totals", () => {
    expect(() =>
      mapPersistedBillingDocument(
        persistedBilling({ policy: undefined }),
        "job-1",
        "document-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
    expect(() =>
      mapPersistedBillingDocument(
        persistedBilling({ totals: { ...totals, totalDueSatang: -1 } }),
        "job-1",
        "document-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
  });

  it("rejects embedded assessment and billing IDs that disagree with their document paths", () => {
    expect(() =>
      mapPersistedServiceJobAssessment(
        persistedAssessment({ jobId: "job-2" }),
        "job-1",
        "assessment-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
    expect(() =>
      mapPersistedBillingDocument(
        persistedBilling({ id: "document-2" }),
        "job-1",
        "document-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
  });

  it("rejects unknown persisted idempotency operations and event roles", () => {
    expect(() =>
      mapPersistedServiceJobIdempotency({
        keyHash: "hash",
        operation: "service_job.unknown",
        jobId: "job-1",
        payloadHash: "payload",
        result: { jobId: "job-1" },
        createdAt: timestamp,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
    expect(() =>
      mapPersistedServiceJobEvent(
        {
          id: "event-1",
          jobId: "job-1",
          operation: "service_job.update",
          actorId: "actor-1",
          actorRole: "superuser",
          occurredAt: timestamp,
          correlationId: "corr-1",
          metadata: { status: "received" },
        },
        "job-1",
        "event-1",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
  });
});

describe("Firestore service-job buffered transaction adapter", () => {
  let firestore: FakeFirestore;

  beforeEach(() => {
    firestore = new FakeFirestore();
  });

  it("completes reads before flushing writes and reserves the production document number", async () => {
    const scope = {
      fiscalYear: 2569,
      warehouseId: "warehouse-1",
      kind: "invoice" as const,
    };
    const expectedNumber = formatServiceJobDocumentNumber(scope, 1);

    const number = await repository(firestore).runInTransaction(
      async (transaction) => {
        const allocated = await transaction.nextDocumentNumber(scope);
        transaction.reserveDocumentNumber(allocated);
        expect(firestore.log.some((entry) => entry.startsWith("stage:"))).toBe(
          false,
        );
        return allocated;
      },
    );

    expect(number).toBe(expectedNumber);
    expect(firestore.log[0]).toMatch(/^read:service_job_document_counters\//);
    expect(firestore.log.at(-1)).toBe("commit");
    expect(
      firestore.documents.has(
        `service_job_document_number_reservations/${serviceJobDocumentNumberReservationId(expectedNumber)}`,
      ),
    ).toBe(true);
  });

  it("keeps buffered actions retry-safe and persists child assessment and evidence once", async () => {
    firestore.retryAttempts = 2;
    firestore.documents.set(
      "service_jobs/job-1",
      serializeServiceJobRecord(record()),
    );
    const assessmentValue: ServiceJobAssessment = {
      ...mapPersistedServiceJobAssessment(
        persistedAssessment(),
        "job-1",
        "assessment-1",
      ),
    };

    await repository(firestore).runInTransaction(async (transaction) => {
      await transaction.getJob("job-1");
      transaction.createAssessment(assessmentValue);
      transaction.putEvidence("job-1", [
        {
          id: "evidence-1",
          category: "before",
          storagePath: "service-jobs/job-1/evidence/evidence-1.jpg",
          uploadedBy: createUserId("technician-1"),
          uploadedAt: now,
          contentType: "image/jpeg",
          sizeBytes: 1024,
          capturedAt: now,
        },
      ]);
    });

    expect(firestore.log).toContain("retry");
    expect(
      firestore.documents.has("service_jobs/job-1/assessments/assessment-1"),
    ).toBe(true);
    expect(
      firestore.documents.has("service_jobs/job-1/evidence/evidence-1"),
    ).toBe(true);
    expect(
      [...firestore.documents.keys()].filter((path) =>
        path.endsWith("/assessment-1"),
      ),
    ).toHaveLength(1);
  });

  it("rejects evidence outside the current job namespace or document identity", async () => {
    const stored = serializeServiceJobRecord(record());
    firestore.documents.set("service_jobs/job-1", stored);
    firestore.documents.set("service_jobs/job-1/evidence/evidence-1", {
      id: "evidence-1",
      category: "before",
      storagePath: "service-jobs/job-2/evidence/evidence-1.jpg",
      uploadedBy: "technician-1",
      uploadedAt: timestamp,
      contentType: "image/jpeg",
      sizeBytes: 100,
      capturedAt: timestamp,
    });

    await expect(
      repository(firestore).runInTransaction((transaction) =>
        transaction.getJob("job-1"),
      ),
    ).rejects.toMatchObject({ code: "INVALID_PERSISTED_SERVICE_JOB" });

    firestore.documents.set("service_jobs/job-1/evidence/evidence-1", {
      ...firestore.documents.get("service_jobs/job-1/evidence/evidence-1"),
      storagePath: "service-jobs/job-1/evidence/../evidence-1.jpg",
    });
    await expect(
      repository(firestore).runInTransaction((transaction) =>
        transaction.getJob("job-1"),
      ),
    ).rejects.toMatchObject({ code: "INVALID_PERSISTED_SERVICE_JOB" });
  });

  it("rejects a handoff signature outside the current job PNG namespace", async () => {
    const stored = serializeServiceJobRecord(record());
    for (const storagePath of [
      "service-jobs/job-2/signatures/signature-1.png",
      "service-jobs/job-1/signatures/../signature-1.png",
      "service-jobs/job-1/signatures/signature-1.jpg",
    ]) {
      firestore.documents.set("service_jobs/job-1", {
        ...stored,
        handoffSignature: {
          signerName: "Customer One",
          storagePath,
          signedAt: timestamp,
        },
      });
      await expect(
        repository(firestore).runInTransaction((transaction) =>
          transaction.getJob("job-1"),
        ),
      ).rejects.toMatchObject({ code: "INVALID_PERSISTED_SERVICE_JOB" });
    }
  });

  it("atomically rejects a duplicate absolute document-number reservation", async () => {
    const scope = {
      fiscalYear: 2569,
      warehouseId: "warehouse-1",
      kind: "invoice" as const,
    };
    const number = formatServiceJobDocumentNumber(scope, 1);
    firestore.documents.set(
      `service_job_document_number_reservations/${serviceJobDocumentNumberReservationId(number)}`,
      { documentNumber: number },
    );
    const before = structuredClone(firestore.documents);

    await expect(
      repository(firestore).runInTransaction(async (transaction) => {
        const allocated = await transaction.nextDocumentNumber(scope);
        transaction.reserveDocumentNumber(allocated);
      }),
    ).rejects.toThrow("ALREADY_EXISTS");

    expect(firestore.documents).toEqual(before);
    expect(
      [...firestore.documents.keys()].some((path) =>
        path.startsWith("service_job_document_counters/"),
      ),
    ).toBe(false);
  });

  it("atomically rejects a duplicate child create without applying earlier buffered writes", async () => {
    firestore.documents.set(
      "service_jobs/job-1/assessments/assessment-1",
      persistedAssessment(),
    );
    const assessmentValue = mapPersistedServiceJobAssessment(
      persistedAssessment(),
      "job-1",
      "assessment-1",
    );
    const scope = {
      fiscalYear: 2569,
      warehouseId: "warehouse-1",
      kind: "invoice" as const,
    };
    const before = structuredClone(firestore.documents);

    await expect(
      repository(firestore).runInTransaction(async (transaction) => {
        await transaction.nextDocumentNumber(scope);
        transaction.createAssessment(assessmentValue);
      }),
    ).rejects.toThrow("ALREADY_EXISTS");

    expect(firestore.documents).toEqual(before);
    expect(
      [...firestore.documents.keys()].some((path) =>
        path.startsWith("service_job_document_counters/"),
      ),
    ).toBe(false);
  });

  it.each([
    ["assignments", 21],
    ["evidence", 51],
  ])(
    "rejects %s overflow instead of returning a partial aggregate",
    async (collection, count) => {
      firestore.documents.set(
        "service_jobs/job-1",
        serializeServiceJobRecord(record()),
      );
      for (let index = 0; index < count; index += 1) {
        const id = `${collection}-${index}`;
        firestore.documents.set(
          `service_jobs/job-1/${collection}/${id}`,
          collection === "assignments"
            ? {
                id,
                technicianId: `technician-${index}`,
                technicianName: `Technician ${index}`,
                role: index === 0 ? "lead" : "assistant",
                status: "pending",
                assignedAt: timestamp,
                assignedBy: "admin-1",
                respondedAt: null,
                rejectionReason: null,
                laborMinutes: 0,
              }
            : {
                id,
                category: "before",
                storagePath: `service-jobs/job-1/evidence/${id}.jpg`,
                uploadedBy: "technician-1",
                uploadedAt: timestamp,
                contentType: "image/jpeg",
                sizeBytes: 100,
                capturedAt: timestamp,
              },
        );
      }

      await expect(
        repository(firestore).runInTransaction((transaction) =>
          transaction.getJob("job-1"),
        ),
      ).rejects.toMatchObject({ code: "SERVICE_JOB_CHILD_CONFLICT" });
    },
  );
});
