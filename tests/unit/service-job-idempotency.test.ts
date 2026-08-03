import { describe, expect, it } from "vitest";

import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  BillingDocument,
  ServiceJob,
  ServiceJobAssessment,
  ServiceJobAssignment,
} from "@/domain/entities/service-job";
import type {
  InventoryMovement,
  InventoryPart,
} from "@/domain/entities/inventory";
import type { UserProfile } from "@/domain/entities/user-profile";
import type {
  BillingDocumentRecord,
  ServiceJobAssessmentResponse,
  ServiceJobEvent,
  ServiceJobEvidenceRecord,
  ServiceJobIdempotencyRecord,
  ServiceJobListCriteria,
  ServiceJobListItem,
  ServiceJobRecord,
  ServiceJobRepository,
  ServiceJobTransaction,
} from "@/domain/repositories/service-job.repository";
import {
  formatServiceJobDocumentNumber,
  parseServiceJobAssessmentResponse,
  resolveServiceJobDocumentNumberScope,
  ServiceJobPersistenceError,
  validateServiceJobEventMetadata,
} from "@/domain/repositories/service-job.repository";
import { ServiceJobDomainService } from "@/domain/services/service-job-domain.service";
import { ServiceJobAccessService } from "@/domain/services/service-job-access.service";
import {
  ServiceJobManagementService,
  type ServiceJobRequestContext,
} from "@/services/service-job-management.service";
import { createUserId } from "@/domain/value-objects/user-id";

const now = new Date("2026-08-02T09:00:00.000Z");

function profile(role: UserProfile["role"], id = `${role}-1`): UserProfile {
  const uid = createUserId(id);
  return {
    id: uid,
    uid,
    email: `${id}@example.com`,
    displayName: id,
    phoneNumber: null,
    photoURL: null,
    role,
    status: "active",
    warehouseId: role === "branch" ? "warehouse-1" : null,
    customerId: role === "customer" ? "customer-1" : null,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

function context(actor: UserProfile): ServiceJobRequestContext {
  return {
    actor,
    correlationId: "corr-1",
    ipAddress: "127.0.0.1",
    userAgent: "vitest",
  };
}

function job(overrides: Partial<ServiceJob> = {}): ServiceJob {
  const adminId = createUserId("admin-1");
  return {
    id: "job-1",
    jobNumber: "SVC-0001",
    schemaVersion: 1,
    workType: "repair",
    fulfillmentMode: "carry_in",
    title: "Repair grinder",
    description: "Noise during operation",
    customer: {
      customerId: "customer-1",
      name: "Customer One",
      taxId: "0100000000001",
      group: null,
      billingAddress: "Bangkok",
      serviceAddress: "Bangkok",
      primaryPhone: "020000000",
      secondaryPhone: null,
    },
    contact: {
      name: "Contact One",
      phone: "020000000",
      extension: null,
      email: "contact@example.com",
    },
    asset: {
      assetId: "asset-1",
      assetCode: "A-001",
      serialNumber: "SN-001",
      equipmentType: "Grinder",
      brand: "Hillkoff",
      model: "G1",
      warrantyStatus: "expired",
      warrantyExpiresAt: null,
      repeatRepair: false,
      previousRepairNumber: null,
      includedAccessories: [],
      observedDefects: ["Noise"],
      additionalRequirements: "",
    },
    status: "scheduled",
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
    createdBy: adminId,
    updatedAt: now,
    updatedBy: adminId,
    version: 2,
    ...overrides,
  };
}

function assessment(
  overrides: Partial<ServiceJobAssessment> = {},
): ServiceJobAssessment {
  const evaluator = createUserId("sales-1");
  return {
    id: "assessment-1",
    jobId: "job-1",
    revision: 1,
    evaluatorId: evaluator,
    status: "draft",
    lines: [
      {
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
      },
    ],
    policy: {
      kind: "out_of_warranty",
      vatBasisPoints: 700,
      withholdingBasisPoints: 300,
      depositBasisPoints: 0,
    },
    totals: {
      serviceSubtotalSatang: 200_000,
      partsSubtotalSatang: 0,
      subtotalSatang: 200_000,
      discountSatang: 0,
      taxableAmountSatang: 200_000,
      vatSatang: 14_000,
      withholdingSatang: 6_000,
      depositSatang: 0,
      totalDueSatang: 208_000,
    },
    approvedAt: null,
    approvedBy: null,
    createdAt: now,
    createdBy: evaluator,
    ...overrides,
  };
}

interface MemoryState {
  jobs: Map<string, ServiceJobRecord>;
  assessments: Map<string, ServiceJobAssessment>;
  documents: Map<string, BillingDocumentRecord>;
  parts: Map<string, InventoryPart>;
  movements: Map<string, InventoryMovement>;
  idempotency: Map<string, ServiceJobIdempotencyRecord>;
  events: ServiceJobEvent[];
  audits: AuditLog[];
  counters: Map<string, number>;
  reservedDocumentNumbers: Set<string>;
  evidence: Map<string, ServiceJobEvidenceRecord>;
  assessmentResponses: Map<string, ServiceJobAssessmentResponse>;
}

function cloneState(state: MemoryState): MemoryState {
  return structuredClone(state);
}

class MemoryTransaction implements ServiceJobTransaction {
  constructor(private readonly state: MemoryState) {}

  async getJob(jobId: string): Promise<ServiceJobRecord | null> {
    return this.state.jobs.get(jobId) ?? null;
  }

  putJob(record: ServiceJobRecord, expectedVersion: number | null): void {
    const current = this.state.jobs.get(record.job.id);
    if (expectedVersion === null) {
      if (current) {
        throw new ServiceJobPersistenceError(
          "SERVICE_JOB_VERSION_CONFLICT",
          "Job already exists",
        );
      }
    } else if (!current || current.job.version !== expectedVersion) {
      throw new ServiceJobPersistenceError(
        "SERVICE_JOB_VERSION_CONFLICT",
        "Job version changed",
      );
    }
    this.state.jobs.set(record.job.id, structuredClone(record));
  }

  replaceAssignments(
    jobId: string,
    assignments: readonly ServiceJobAssignment[],
  ): void {
    const current = this.state.jobs.get(jobId);
    if (!current) throw new Error("job missing");
    this.state.jobs.set(jobId, {
      ...current,
      job: { ...current.job, assignments: structuredClone(assignments) },
    });
  }

  putAssignment(jobId: string, assignment: ServiceJobAssignment): void {
    const current = this.state.jobs.get(jobId);
    if (!current) throw new Error("job missing");
    const assignments = current.job.assignments.map((item) =>
      item.id === assignment.id ? structuredClone(assignment) : item,
    );
    this.state.jobs.set(jobId, {
      ...current,
      job: { ...current.job, assignments },
    });
  }

  putExecution(jobId: string, execution: ServiceJobRecord["execution"]): void {
    const current = this.state.jobs.get(jobId);
    if (!current) throw new Error("job missing");
    this.state.jobs.set(jobId, {
      ...current,
      execution: structuredClone(execution),
    });
  }

  putEvidence(
    jobId: string,
    evidence: readonly ServiceJobEvidenceRecord[],
  ): void {
    for (const [id, item] of this.state.evidence) {
      if (item.storagePath.startsWith(`service-jobs/${jobId}/`)) {
        this.state.evidence.delete(id);
      }
    }
    for (const item of evidence) {
      this.state.evidence.set(item.id, structuredClone(item));
    }
  }

  async getAssessment(
    _jobId: string,
    assessmentId: string,
  ): Promise<ServiceJobAssessment | null> {
    return this.state.assessments.get(assessmentId) ?? null;
  }

  async listAssessments(
    jobId: string,
    limit: number,
  ): Promise<readonly ServiceJobAssessment[]> {
    return [...this.state.assessments.values()]
      .filter((item) => item.jobId === jobId)
      .sort((left, right) => right.revision - left.revision)
      .slice(0, limit)
      .map((item) => structuredClone(item));
  }

  createAssessment(assessmentValue: ServiceJobAssessment): void {
    if (this.state.assessments.has(assessmentValue.id)) {
      throw new Error("assessment exists");
    }
    this.state.assessments.set(
      assessmentValue.id,
      structuredClone(assessmentValue),
    );
  }

  putAssessment(assessmentValue: ServiceJobAssessment): void {
    this.state.assessments.set(
      assessmentValue.id,
      structuredClone(assessmentValue),
    );
  }

  putAssessmentResponse(
    jobId: string,
    assessmentId: string,
    response: ServiceJobAssessmentResponse,
  ): void {
    this.state.assessmentResponses.set(
      `${jobId}/${assessmentId}`,
      structuredClone(response),
    );
  }

  async getBillingDocument(
    _jobId: string,
    documentId: string,
  ): Promise<BillingDocumentRecord | null> {
    return this.state.documents.get(documentId) ?? null;
  }

  async listBillingDocuments(
    jobId: string,
    limit: number,
  ): Promise<readonly BillingDocumentRecord[]> {
    return [...this.state.documents.values()]
      .filter((item) => item.jobId === jobId)
      .sort((left, right) => right.issuedAt.getTime() - left.issuedAt.getTime())
      .slice(0, limit)
      .map((item) => structuredClone(item));
  }

  createBillingDocument(document: BillingDocumentRecord): void {
    if (this.state.documents.has(document.id)) {
      throw new Error("document exists");
    }
    this.state.documents.set(document.id, structuredClone(document));
  }

  voidBillingDocument(document: BillingDocumentRecord): void {
    const current = this.state.documents.get(document.id);
    if (!current || current.status !== "issued") {
      throw new ServiceJobPersistenceError(
        "BILLING_DOCUMENT_IMMUTABLE",
        "Document cannot be changed",
      );
    }
    this.state.documents.set(document.id, structuredClone(document));
  }

  async getInventoryPart(partId: string): Promise<InventoryPart | null> {
    return this.state.parts.get(partId) ?? null;
  }

  issueInventory(
    part: InventoryPart,
    movement: InventoryMovement,
    expectedVersion: number,
  ): void {
    const current = this.state.parts.get(part.id);
    if (!current || current.version !== expectedVersion) {
      throw new ServiceJobPersistenceError(
        "INVENTORY_VERSION_CONFLICT",
        "Part version changed",
      );
    }
    this.state.parts.set(part.id, structuredClone(part));
    this.state.movements.set(movement.id, structuredClone(movement));
  }

  async getInventoryMovement(
    movementId: string,
  ): Promise<InventoryMovement | null> {
    return this.state.movements.get(movementId) ?? null;
  }

  async getIdempotency(keyHash: string) {
    return this.state.idempotency.get(keyHash) ?? null;
  }

  createIdempotency(record: ServiceJobIdempotencyRecord): void {
    if (this.state.idempotency.has(record.keyHash)) {
      throw new Error("idempotency exists");
    }
    this.state.idempotency.set(record.keyHash, structuredClone(record));
  }

  async nextDocumentNumber(input: {
    fiscalYear: number;
    warehouseId: string | null;
    kind: BillingDocument["kind"];
  }): Promise<string> {
    const scope = resolveServiceJobDocumentNumberScope(input);
    const next = (this.state.counters.get(scope.counterId) ?? 0) + 1;
    this.state.counters.set(scope.counterId, next);
    return formatServiceJobDocumentNumber(input, next);
  }

  reserveDocumentNumber(documentNumber: string): void {
    if (this.state.reservedDocumentNumbers.has(documentNumber)) {
      throw new ServiceJobPersistenceError(
        "SERVICE_JOB_CHILD_CONFLICT",
        "Document number is already reserved",
      );
    }
    this.state.reservedDocumentNumbers.add(documentNumber);
  }

  appendEvent(event: ServiceJobEvent): void {
    this.state.events.push(structuredClone(event));
  }

  appendAudit(audit: AuditLog): void {
    this.state.audits.push(structuredClone(audit));
  }
}

class MemoryRepository implements ServiceJobRepository {
  state: MemoryState;
  private sequence = 0;
  private transactionTail: Promise<void> = Promise.resolve();

  constructor(
    record: ServiceJobRecord,
    assessmentValue?: ServiceJobAssessment,
  ) {
    this.state = {
      jobs: new Map([[record.job.id, structuredClone(record)]]),
      assessments: assessmentValue
        ? new Map([[assessmentValue.id, structuredClone(assessmentValue)]])
        : new Map(),
      documents: new Map(),
      parts: new Map(),
      movements: new Map(),
      idempotency: new Map(),
      events: [],
      audits: [],
      counters: new Map(),
      reservedDocumentNumbers: new Set(),
      evidence: new Map(),
      assessmentResponses: new Map(),
    };
  }

  createId(kind: string): string {
    void kind;
    this.sequence += 1;
    return `generated-${this.sequence}`;
  }

  async findById(id: string): Promise<ServiceJobRecord | null> {
    return this.state.jobs.get(id) ?? null;
  }

  async list(
    criteria: ServiceJobListCriteria,
  ): Promise<readonly ServiceJobListItem[]> {
    void criteria;
    return [];
  }

  async listAssessments() {
    return [];
  }

  async listBillingDocuments() {
    return [];
  }

  async listEvents() {
    return [];
  }

  async runInTransaction<T>(
    work: (transaction: ServiceJobTransaction) => Promise<T>,
  ): Promise<T> {
    const previous = this.transactionTail;
    let release = (): void => undefined;
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const candidate = cloneState(this.state);
      const result = await work(new MemoryTransaction(candidate));
      this.state = candidate;
      return result;
    } finally {
      release();
    }
  }
}

function record(jobValue: ServiceJob): ServiceJobRecord {
  return {
    job: jobValue,
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

function service(repository: MemoryRepository) {
  return new ServiceJobManagementService(
    repository,
    new ServiceJobDomainService(),
    new ServiceJobAccessService(),
    () => now,
  );
}

describe("ServiceJobManagementService idempotent transactions", () => {
  it("replays an assignment without duplicate child, event, audit, or version writes", async () => {
    const repository = new MemoryRepository(record(job()));
    const management = service(repository);
    const input = {
      expectedVersion: 2,
      idempotencyKey: "assignment-key-0001",
      assignments: [
        {
          technicianId: createUserId("technician-1"),
          technicianName: "Technician One",
          role: "lead" as const,
        },
      ],
    };

    const first = await management.assign(
      "job-1",
      input,
      context(profile("admin")),
    );
    const replay = await management.assign(
      "job-1",
      input,
      context(profile("admin")),
    );

    expect(first.job.version).toBe(3);
    expect(replay).toEqual(first);
    expect(repository.state.jobs.get("job-1")?.job.assignments).toHaveLength(1);
    expect(repository.state.events).toHaveLength(1);
    expect(repository.state.audits).toHaveLength(1);
    expect(repository.state.idempotency).toHaveLength(1);
  });

  it("re-authorizes a job mutation replay instead of treating its key as authorization", async () => {
    const repository = new MemoryRepository(record(job()));
    const management = service(repository);
    const input = {
      expectedVersion: 2,
      idempotencyKey: "assignment-auth-001",
      assignments: [
        {
          technicianId: createUserId("technician-1"),
          technicianName: "Technician One",
          role: "lead" as const,
        },
      ],
    };

    await management.assign("job-1", input, context(profile("admin")));

    await expect(
      management.assign("job-1", input, context(profile("sales"))),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_ACCESS_DENIED" });
    expect(repository.state.events).toHaveLength(1);
  });

  it("authorizes before revealing an idempotency payload conflict", async () => {
    const repository = new MemoryRepository(record(job()));
    const management = service(repository);
    const input = {
      expectedVersion: 2,
      idempotencyKey: "assignment-oracle-001",
      assignments: [
        {
          technicianId: createUserId("technician-1"),
          technicianName: "Technician One",
          role: "lead" as const,
        },
      ],
    };
    await management.assign("job-1", input, context(profile("admin")));

    await expect(
      management.assign(
        "job-1",
        {
          ...input,
          assignments: [
            {
              ...input.assignments[0]!,
              technicianName: "Payload probe",
            },
          ],
        },
        context(profile("sales")),
      ),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_ACCESS_DENIED" });
  });

  it("allows assignment response only while the assignment is pending", async () => {
    const technicianId = createUserId("technician-1");
    const accepted: ServiceJobAssignment = {
      id: "assignment-1",
      technicianId,
      technicianName: "Technician One",
      role: "lead",
      status: "accepted",
      assignedAt: now,
      assignedBy: createUserId("admin-1"),
      respondedAt: now,
      rejectionReason: null,
      laborMinutes: 0,
    };
    const repository = new MemoryRepository(
      record(
        job({
          status: "assigned",
          assignments: [accepted],
          assignedTechnicianIds: [technicianId],
          leadTechnicianId: technicianId,
        }),
      ),
    );

    await expect(
      service(repository).respondToAssignment(
        "job-1",
        accepted.id,
        {
          expectedVersion: 2,
          idempotencyKey: "assignment-response-state-001",
          response: "accepted",
        },
        context(profile("technician", "technician-1")),
      ),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_CHILD_CONFLICT" });
  });

  it.each([
    ["accepted", undefined],
    ["rejected", "Unavailable"],
  ] as const)(
    "replays a %s assignment response for the same technician after mutation",
    async (response, rejectionReason) => {
      const technicianId = createUserId("technician-1");
      const pending: ServiceJobAssignment = {
        id: "assignment-1",
        technicianId,
        technicianName: "Technician One",
        role: "lead",
        status: "pending",
        assignedAt: now,
        assignedBy: createUserId("admin-1"),
        respondedAt: null,
        rejectionReason: null,
        laborMinutes: 0,
      };
      const repository = new MemoryRepository(
        record(
          job({
            status: "assigned",
            assignments: [pending],
            assignedTechnicianIds: [technicianId],
            leadTechnicianId: technicianId,
          }),
        ),
      );
      const management = service(repository);
      const command = {
        expectedVersion: 2,
        idempotencyKey: `assignment-response-replay-${response}`,
        response,
        ...(rejectionReason ? { rejectionReason } : {}),
      };
      const actor = context(profile("technician", "technician-1"));

      const first = await management.respondToAssignment(
        "job-1",
        pending.id,
        command,
        actor,
      );
      const replay = await management.respondToAssignment(
        "job-1",
        pending.id,
        command,
        actor,
      );

      expect(replay).toEqual(first);
      expect(repository.state.events).toHaveLength(1);
      expect(repository.state.audits).toHaveLength(1);
      await expect(
        management.respondToAssignment(
          "job-1",
          pending.id,
          command,
          context(profile("technician", "technician-2")),
        ),
      ).rejects.toMatchObject({ code: "SERVICE_JOB_ACCESS_DENIED" });
    },
  );

  it("reassigns a rejected lead without resetting an accepted assistant", async () => {
    const rejectedLead: ServiceJobAssignment = {
      id: "assignment-rejected-lead",
      technicianId: createUserId("technician-old-lead"),
      technicianName: "Old Lead",
      role: "lead",
      status: "rejected",
      assignedAt: now,
      assignedBy: createUserId("admin-1"),
      respondedAt: now,
      rejectionReason: "Unavailable",
      laborMinutes: 0,
    };
    const acceptedAssistant: ServiceJobAssignment = {
      id: "assignment-accepted-assistant",
      technicianId: createUserId("technician-assistant"),
      technicianName: "Accepted Assistant",
      role: "assistant",
      status: "accepted",
      assignedAt: now,
      assignedBy: createUserId("admin-1"),
      respondedAt: now,
      rejectionReason: null,
      laborMinutes: 80,
    };
    const repository = new MemoryRepository(
      record(
        job({
          status: "assigned",
          assignments: [rejectedLead, acceptedAssistant],
          assignedTechnicianIds: [acceptedAssistant.technicianId],
          leadTechnicianId: null,
        }),
      ),
    );

    const updated = await service(repository).assign(
      "job-1",
      {
        expectedVersion: 2,
        idempotencyKey: "assignment-replace-rejected-001",
        assignments: [
          {
            technicianId: createUserId("technician-new-lead"),
            technicianName: "New Lead",
            role: "lead",
          },
        ],
      },
      context(profile("admin")),
    );

    expect(updated.job.assignments).toHaveLength(2);
    expect(updated.job.assignments).toContainEqual(
      expect.objectContaining({
        id: acceptedAssistant.id,
        status: "accepted",
        laborMinutes: 80,
      }),
    );
    expect(updated.job.assignments).not.toContainEqual(
      expect.objectContaining({ id: rejectedLead.id }),
    );
    expect(updated.job.leadTechnicianId).toBe(
      createUserId("technician-new-lead"),
    );
  });

  it("denies execution replay after the technician assignment becomes rejected", async () => {
    const technicianId = createUserId("technician-1");
    const accepted: ServiceJobAssignment = {
      id: "assignment-1",
      technicianId,
      technicianName: "Technician One",
      role: "lead",
      status: "accepted",
      assignedAt: now,
      assignedBy: createUserId("admin-1"),
      respondedAt: now,
      rejectionReason: null,
      laborMinutes: 0,
    };
    const repository = new MemoryRepository(
      record(
        job({
          status: "assigned",
          assignments: [accepted],
          assignedTechnicianIds: [technicianId],
          leadTechnicianId: technicianId,
        }),
      ),
    );
    const management = service(repository);
    const command = {
      expectedVersion: 2,
      idempotencyKey: "execution-replay-state-001",
      targetStatus: "in_progress" as const,
    };
    await management.transition(
      "job-1",
      command,
      context(profile("technician", "technician-1")),
    );
    const stored = repository.state.jobs.get("job-1")!;
    repository.state.jobs.set("job-1", {
      ...stored,
      job: {
        ...stored.job,
        assignments: [
          {
            ...accepted,
            status: "rejected",
            rejectionReason: "Coordinator changed assignment",
          },
        ],
      },
    });

    await expect(
      management.transition(
        "job-1",
        command,
        context(profile("technician", "technician-1")),
      ),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_ACCESS_DENIED" });
  });

  it("rejects reusing a key for a different payload, operation, or job", async () => {
    const repository = new MemoryRepository(record(job()));
    const management = service(repository);
    const input = {
      expectedVersion: 2,
      idempotencyKey: "shared-key-0000001",
      assignments: [
        {
          technicianId: createUserId("technician-1"),
          technicianName: "Technician One",
          role: "lead" as const,
        },
      ],
    };
    await management.assign("job-1", input, context(profile("admin")));

    await expect(
      management.assign(
        "job-1",
        {
          ...input,
          assignments: [
            { ...input.assignments[0]!, technicianName: "Changed" },
          ],
        },
        context(profile("admin")),
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });

    await expect(
      management.handoff(
        "job-1",
        {
          expectedVersion: 3,
          idempotencyKey: input.idempotencyKey,
          customerSignature: null,
          overrideReason: "Emergency",
          deliveryNotes: "",
        },
        context(profile("admin")),
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });

    repository.state.jobs.set(
      "job-2",
      record(job({ id: "job-2", jobNumber: "SVC-0002", version: 2 })),
    );
    await expect(
      management.assign("job-2", input, context(profile("admin"))),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("rejects stale expected versions without partial event, audit, or idempotency writes", async () => {
    const repository = new MemoryRepository(record(job()));
    const management = service(repository);

    await expect(
      management.assign(
        "job-1",
        {
          expectedVersion: 1,
          idempotencyKey: "stale-assignment-01",
          assignments: [
            {
              technicianId: createUserId("technician-1"),
              technicianName: "Technician One",
              role: "lead",
            },
          ],
        },
        context(profile("admin")),
      ),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_VERSION_CONFLICT" });

    expect(repository.state.jobs.get("job-1")?.job.version).toBe(2);
    expect(repository.state.events).toHaveLength(0);
    expect(repository.state.audits).toHaveLength(0);
    expect(repository.state.idempotency).toHaveLength(0);
  });

  it("approves an assessment once and replays the immutable approval", async () => {
    const repository = new MemoryRepository(
      record(job({ status: "assessment_pending" })),
      assessment(),
    );
    const management = service(repository);
    const customer = profile("customer", "customer-approver");
    const input = {
      expectedVersion: 2,
      idempotencyKey: "approve-key-00001",
      responderName: "Customer Approver",
      respondedAt: now,
      emergencyOverrideReason: null,
    };

    const first = await management.approveAssessment(
      "job-1",
      "assessment-1",
      input,
      context(customer),
    );
    const replay = await management.approveAssessment(
      "job-1",
      "assessment-1",
      input,
      context(customer),
    );

    expect(first.status).toBe("approved");
    expect(first.approvedBy).toBe(customer.uid);
    expect(replay).toEqual(first);
    expect(repository.state.events).toHaveLength(1);
  });

  it("derives evaluator identity from the authenticated actor", async () => {
    const technicianId = createUserId("technician-1");
    const accepted: ServiceJobAssignment = {
      id: "assignment-1",
      technicianId,
      technicianName: "Technician One",
      role: "lead",
      status: "accepted",
      assignedAt: now,
      assignedBy: createUserId("admin-1"),
      respondedAt: now,
      rejectionReason: null,
      laborMinutes: 0,
    };
    const repository = new MemoryRepository(
      record(
        job({
          status: "assessment_pending",
          assignments: [accepted],
          assignedTechnicianIds: [technicianId],
          leadTechnicianId: technicianId,
        }),
      ),
    );

    await expect(
      service(repository).createAssessment(
        "job-1",
        {
          expectedVersion: 2,
          idempotencyKey: "assessment-evaluator-001",
          evaluatorId: createUserId("technician-2"),
          lines: assessment().lines,
          policy: assessment().policy,
        },
        context(profile("technician", "technician-1")),
      ),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_ACCESS_DENIED" });
    expect(repository.state.assessments).toHaveLength(0);
  });

  it("allocates sequential assessment revisions and supersedes the prior draft", async () => {
    const repository = new MemoryRepository(
      record(job({ status: "assessment_pending" })),
    );
    const management = service(repository);
    const first = await management.createAssessment(
      "job-1",
      {
        expectedVersion: 2,
        idempotencyKey: "assessment-revision-001",
        evaluatorId: createUserId("sales-1"),
        lines: assessment().lines,
        policy: assessment().policy,
      },
      context(profile("sales")),
    );
    const second = await management.createAssessment(
      "job-1",
      {
        expectedVersion: 3,
        idempotencyKey: "assessment-revision-002",
        evaluatorId: createUserId("sales-1"),
        lines: assessment().lines,
        policy: assessment().policy,
      },
      context(profile("sales")),
    );

    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    expect(repository.state.assessments.get(first.id)?.status).toBe(
      "superseded",
    );
    expect(
      [...repository.state.assessments.values()].filter(
        (item) => item.status === "draft",
      ),
    ).toHaveLength(1);
  });

  it("serializes concurrent assessment revisions so only one stale version wins", async () => {
    const repository = new MemoryRepository(
      record(job({ status: "assessment_pending" })),
    );
    const management = service(repository);
    const command = (suffix: string) => ({
      expectedVersion: 2,
      idempotencyKey: `assessment-concurrent-${suffix}`,
      evaluatorId: createUserId("sales-1"),
      lines: assessment().lines,
      policy: assessment().policy,
    });

    const outcomes = await Promise.allSettled([
      management.createAssessment(
        "job-1",
        command("001"),
        context(profile("sales")),
      ),
      management.createAssessment(
        "job-1",
        command("002"),
        context(profile("sales")),
      ),
    ]);

    expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(outcomes.filter((item) => item.status === "rejected")).toHaveLength(
      1,
    );
    expect(repository.state.assessments).toHaveLength(1);
  });

  it("re-authorizes assessment replay against current customer scope", async () => {
    const repository = new MemoryRepository(
      record(job({ status: "assessment_pending" })),
      assessment(),
    );
    const management = service(repository);
    const input = {
      expectedVersion: 2,
      idempotencyKey: "approval-auth-0001",
      responderName: "Customer Approver",
      respondedAt: now,
      emergencyOverrideReason: null,
    };
    await management.approveAssessment(
      "job-1",
      "assessment-1",
      input,
      context(profile("customer", "customer-approver")),
    );
    const otherCustomer = {
      ...profile("customer", "customer-outsider"),
      customerId: "customer-2",
    };

    await expect(
      management.approveAssessment(
        "job-1",
        "assessment-1",
        input,
        context(otherCustomer),
      ),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_ACCESS_DENIED" });
  });

  it("allocates one atomic Buddhist-year document number and preserves it on replay", async () => {
    const approverId = createUserId("customer-approver");
    const approved = assessment({
      status: "approved",
      approvedAt: now,
      approvedBy: approverId,
    });
    const repository = new MemoryRepository(
      record(
        job({
          status: "approved",
          approvedAssessmentId: approved.id,
        }),
      ),
      approved,
    );
    const management = service(repository);
    const input = {
      expectedVersion: 2,
      idempotencyKey: "billing-key-00001",
      assessmentId: approved.id,
      kind: "service_invoice" as const,
      issueDate: now,
      dueDate: new Date("2026-08-31T09:00:00.000Z"),
      paymentTerms: "30 days",
      department: "Service",
      salesperson: "Sales One",
      emergencyOverrideReason: null,
    };

    const first = await management.issueBillingDocument(
      "job-1",
      input,
      context(profile("admin")),
    );
    const replay = await management.issueBillingDocument(
      "job-1",
      input,
      context(profile("admin")),
    );

    expect(first.documentNumber).toMatch(
      /^SVC-2569-WAREHOUSE-1-[A-F0-9]{12}-000001$/,
    );
    expect(replay).toEqual(first);
    expect(repository.state.documents).toHaveLength(1);
    expect(repository.state.counters.values().next().value).toBe(1);
    expect(repository.state.events).toHaveLength(1);
  });

  it("re-authorizes billing replay for the issue capability", async () => {
    const approved = assessment({
      status: "approved",
      approvedAt: now,
      approvedBy: createUserId("customer-approver"),
    });
    const repository = new MemoryRepository(
      record(job({ status: "approved", approvedAssessmentId: approved.id })),
      approved,
    );
    const management = service(repository);
    const input = {
      expectedVersion: 2,
      idempotencyKey: "billing-auth-0001",
      assessmentId: approved.id,
      kind: "invoice" as const,
      issueDate: now,
      dueDate: now,
      paymentTerms: "Due now",
      department: "Service",
      salesperson: "Sales",
      emergencyOverrideReason: null,
    };
    await management.issueBillingDocument(
      "job-1",
      input,
      context(profile("admin")),
    );

    await expect(
      management.issueBillingDocument(
        "job-1",
        input,
        context(profile("executive")),
      ),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_ACCESS_DENIED" });
  });

  it("issues distinct service and parts documents, blocks an active duplicate kind, and reissues after void", async () => {
    const approved = assessment({
      status: "approved",
      approvedAt: now,
      approvedBy: createUserId("customer-approver"),
      lines: [
        ...assessment().lines,
        {
          id: "line-part-1",
          code: "PART-1",
          type: "part",
          description: "Replacement seal",
          unit: "piece",
          quantity: 2,
          unitPriceSatang: 50_000,
          discountBasisPoints: 0,
          discountReason: null,
          warehouseId: "warehouse-1",
          warrantyMonths: 3,
        },
      ],
      totals: {
        serviceSubtotalSatang: 200_000,
        partsSubtotalSatang: 100_000,
        subtotalSatang: 300_000,
        discountSatang: 0,
        taxableAmountSatang: 300_000,
        vatSatang: 21_000,
        withholdingSatang: 9_000,
        depositSatang: 0,
        totalDueSatang: 312_000,
      },
    });
    const repository = new MemoryRepository(
      record(
        job({
          status: "approved",
          approvedAssessmentId: approved.id,
        }),
      ),
      approved,
    );
    const management = service(repository);
    const issue = (
      kind: BillingDocument["kind"],
      expectedVersion: number,
      idempotencyKey: string,
    ) => ({
      expectedVersion,
      idempotencyKey,
      assessmentId: approved.id,
      kind,
      issueDate: now,
      dueDate: now,
      paymentTerms: "Due now",
      department: "Service",
      salesperson: "Sales",
      emergencyOverrideReason: null,
    });

    const serviceDocument = await management.issueBillingDocument(
      "job-1",
      issue("service_invoice", 2, "billing-multi-service-001"),
      context(profile("admin")),
    );
    const partsDocument = await management.issueBillingDocument(
      "job-1",
      issue("parts_invoice", 3, "billing-multi-parts-001"),
      context(profile("admin")),
    );

    expect(serviceDocument.lines.map((line) => line.type)).toEqual(["service"]);
    expect(partsDocument.lines.map((line) => line.type)).toEqual(["part"]);
    expect(serviceDocument.policy).toEqual(approved.policy);
    expect(partsDocument.policy).toEqual(approved.policy);

    await expect(
      management.issueBillingDocument(
        "job-1",
        issue("service_invoice", 4, "billing-multi-duplicate-001"),
        context(profile("admin")),
      ),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_CHILD_CONFLICT" });
    expect(repository.state.documents).toHaveLength(2);

    await management.voidBillingDocument(
      "job-1",
      serviceDocument.id,
      {
        expectedVersion: 4,
        idempotencyKey: "billing-multi-void-001",
        reason: "Corrected service invoice",
      },
      context(profile("admin")),
    );
    const reissued = await management.issueBillingDocument(
      "job-1",
      issue("service_invoice", 5, "billing-multi-reissue-001"),
      context(profile("admin")),
    );

    expect(reissued.documentNumber).not.toBe(serviceDocument.documentNumber);
    expect(repository.state.documents).toHaveLength(3);
  });

  it("requires separation of duties and records an admin emergency reason in immutable audit data", async () => {
    const admin = profile("admin");
    const approved = assessment({
      status: "approved",
      approvedAt: now,
      approvedBy: admin.uid,
    });
    const repository = new MemoryRepository(
      record(job({ status: "approved", approvedAssessmentId: approved.id })),
      approved,
    );
    const management = service(repository);
    const base = {
      expectedVersion: 2,
      idempotencyKey: "sod-billing-key-01",
      assessmentId: approved.id,
      kind: "invoice" as const,
      issueDate: now,
      dueDate: now,
      paymentTerms: "Due now",
      department: "Service",
      salesperson: "Admin",
    };

    await expect(
      management.issueBillingDocument(
        "job-1",
        { ...base, emergencyOverrideReason: null },
        context(admin),
      ),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_OVERRIDE_REASON_REQUIRED" });
    expect(repository.state.documents).toHaveLength(0);

    await management.issueBillingDocument(
      "job-1",
      {
        ...base,
        emergencyOverrideReason: "Accounting unavailable during outage",
      },
      context(admin),
    );
    expect(repository.state.audits[0]?.changes).toMatchObject({
      emergencyOverride: true,
      emergencyOverrideReason: "Accounting unavailable during outage",
    });
  });

  it("voids an issued document once without changing or reusing its number", async () => {
    const approved = assessment({
      status: "approved",
      approvedAt: now,
      approvedBy: createUserId("customer-approver"),
    });
    const repository = new MemoryRepository(
      record(job({ status: "approved", approvedAssessmentId: approved.id })),
      approved,
    );
    const management = service(repository);
    const adminContext = context(profile("admin"));
    const issued = await management.issueBillingDocument(
      "job-1",
      {
        expectedVersion: 2,
        idempotencyKey: "issue-before-void1",
        assessmentId: approved.id,
        kind: "invoice",
        issueDate: now,
        dueDate: now,
        paymentTerms: "Due now",
        department: "Service",
        salesperson: "Sales",
        emergencyOverrideReason: null,
      },
      adminContext,
    );
    const voidInput = {
      expectedVersion: 3,
      idempotencyKey: "void-key-0000001",
      reason: "Incorrect customer purchase order",
    };

    const first = await management.voidBillingDocument(
      "job-1",
      issued.id,
      voidInput,
      adminContext,
    );
    const replay = await management.voidBillingDocument(
      "job-1",
      issued.id,
      voidInput,
      adminContext,
    );

    expect(first.status).toBe("void");
    expect(first.documentNumber).toBe(issued.documentNumber);
    expect(replay).toEqual(first);
    expect(repository.state.counters.values().next().value).toBe(1);
    expect(repository.state.documents).toHaveLength(1);
  });

  it("issues inventory once with a service_job reference and rolls back every write on stock conflict", async () => {
    const repository = new MemoryRepository(
      record(job({ status: "in_progress" })),
    );
    const warehouseId = createUserId("warehouse-1");
    repository.state.parts.set("part-1", {
      id: "part-1",
      partNumber: "P-001",
      name: "Seal",
      description: "",
      unit: "piece",
      quantityOnHand: 10,
      reorderPoint: 2,
      unitCost: 5_000,
      active: true,
      createdAt: now,
      createdBy: warehouseId,
      updatedAt: now,
      updatedBy: warehouseId,
      version: 4,
    });
    const management = service(repository);
    const input = {
      expectedVersion: 2,
      idempotencyKey: "inventory-key-001",
      partId: "part-1",
      partExpectedVersion: 4,
      quantity: 3,
      notes: "Used for repair",
    };

    const first = await management.issueInventory(
      "job-1",
      input,
      context(profile("warehouse")),
    );
    const replay = await management.issueInventory(
      "job-1",
      input,
      context(profile("warehouse")),
    );

    expect(first.movement.referenceType).toBe("service_job");
    expect(repository.state.parts.get("part-1")?.quantityOnHand).toBe(7);
    expect(repository.state.movements).toHaveLength(1);
    expect(replay).toEqual(first);

    const before = cloneState(repository.state);
    await expect(
      management.issueInventory(
        "job-1",
        {
          ...input,
          expectedVersion: 3,
          partExpectedVersion: 3,
          idempotencyKey: "inventory-stale-01",
        },
        context(profile("warehouse")),
      ),
    ).rejects.toMatchObject({ code: "INVENTORY_VERSION_CONFLICT" });
    expect(repository.state).toEqual(before);
  });

  it("re-authorizes inventory replay before returning movement data", async () => {
    const repository = new MemoryRepository(
      record(job({ status: "in_progress" })),
    );
    const warehouseId = createUserId("warehouse-1");
    repository.state.parts.set("part-1", {
      id: "part-1",
      partNumber: "P-001",
      name: "Seal",
      description: "",
      unit: "piece",
      quantityOnHand: 10,
      reorderPoint: 2,
      unitCost: 5_000,
      active: true,
      createdAt: now,
      createdBy: warehouseId,
      updatedAt: now,
      updatedBy: warehouseId,
      version: 4,
    });
    const management = service(repository);
    const input = {
      expectedVersion: 2,
      idempotencyKey: "inventory-auth-001",
      partId: "part-1",
      partExpectedVersion: 4,
      quantity: 1,
      notes: "Used for repair",
    };
    await management.issueInventory(
      "job-1",
      input,
      context(profile("warehouse")),
    );

    await expect(
      management.issueInventory("job-1", input, context(profile("sales"))),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_ACCESS_DENIED" });
  });

  it("records handoff exactly once and keeps event metadata free of PII", async () => {
    const repository = new MemoryRepository(
      record(job({ status: "invoiced" })),
    );
    const management = service(repository);
    const input = {
      expectedVersion: 2,
      idempotencyKey: "handoff-key-0001",
      customerSignature: {
        signerName: "Customer One",
        storagePath: "service-jobs/job-1/signatures/signature-1.png",
        signedAt: now,
      },
      overrideReason: null,
      deliveryNotes: "Machine received in good condition",
    };

    const first = await management.handoff(
      "job-1",
      input,
      context(profile("warehouse")),
    );
    const replay = await management.handoff(
      "job-1",
      input,
      context(profile("warehouse")),
    );

    expect(first.job.status).toBe("handed_off");
    expect(replay).toEqual(first);
    expect(repository.state.events).toHaveLength(1);
    expect(repository.state.events[0]?.metadata).toEqual({
      status: "handed_off",
      signatureCaptured: true,
      emergencyOverride: false,
    });
    expect(JSON.stringify(repository.state.events[0]?.metadata)).not.toMatch(
      /Customer One|good condition|signature-1/i,
    );
  });

  it("re-authorizes handoff replay before returning the signed job", async () => {
    const repository = new MemoryRepository(
      record(job({ status: "invoiced" })),
    );
    const management = service(repository);
    const input = {
      expectedVersion: 2,
      idempotencyKey: "handoff-auth-001",
      customerSignature: {
        signerName: "Customer One",
        storagePath: "service-jobs/job-1/signatures/signature-1.png",
        signedAt: now,
      },
      overrideReason: null,
      deliveryNotes: "Received",
    };
    await management.handoff("job-1", input, context(profile("warehouse")));

    await expect(
      management.handoff("job-1", input, context(profile("sales"))),
    ).rejects.toMatchObject({ code: "SERVICE_JOB_ACCESS_DENIED" });
  });
});

describe("ServiceJobManagementService operational transitions", () => {
  const assignment: ServiceJobAssignment = {
    id: "assignment-1",
    technicianId: createUserId("technician-1"),
    technicianName: "Technician One",
    role: "lead",
    status: "accepted",
    assignedAt: now,
    assignedBy: createUserId("admin-1"),
    respondedAt: now,
    rejectionReason: null,
    laborMinutes: 0,
  };

  it.each([
    ["assigned", "in_progress"],
    ["in_progress", "waiting_parts"],
    ["in_progress", "waiting_customer"],
  ] as const)(
    "allows an assigned technician and denies an unassigned technician for %s to %s",
    async (source, target) => {
      const jobValue = job({
        status: source,
        assignments: [assignment],
        assignedTechnicianIds: [assignment.technicianId],
        leadTechnicianId: assignment.technicianId,
      });
      const repository = new MemoryRepository(record(jobValue));
      const management = service(repository);

      await expect(
        management.transition(
          "job-1",
          {
            expectedVersion: 2,
            idempotencyKey: `transition-denied-${target}`,
            targetStatus: target,
          },
          context(profile("technician", "technician-2")),
        ),
      ).rejects.toMatchObject({ code: "SERVICE_JOB_ACCESS_DENIED" });

      const updated = await management.transition(
        "job-1",
        {
          expectedVersion: 2,
          idempotencyKey: `transition-allowed-${target}`,
          targetStatus: target,
        },
        context(profile("technician", "technician-1")),
      );
      expect(updated.job.status).toBe(target);
    },
  );
});

describe("service-job persistence boundaries", () => {
  it("creates collision-resistant production number scopes from the full warehouse ID", () => {
    const left = {
      fiscalYear: 2569,
      warehouseId: "warehouse-northern-region-branch-0000000001",
      kind: "invoice" as const,
    };
    const right = {
      ...left,
      warehouseId: "warehouse-northern-region-branch-0000000002",
    };

    const leftScope = resolveServiceJobDocumentNumberScope(left);
    const rightScope = resolveServiceJobDocumentNumberScope(right);

    expect(leftScope.counterId).not.toBe(rightScope.counterId);
    expect(leftScope.counterId).toContain("2569");
    expect(leftScope.counterId).toContain("invoice");
    expect(formatServiceJobDocumentNumber(left, 1)).not.toBe(
      formatServiceJobDocumentNumber(right, 1),
    );
    expect(formatServiceJobDocumentNumber(left, 1)).toMatch(
      /^INV-2569-WAREHOUSE-NO-[A-F0-9]{12}-000001$/,
    );
  });

  it("rejects unknown persisted assessment response values", () => {
    expect(parseServiceJobAssessmentResponse("approved")).toBe("approved");
    expect(parseServiceJobAssessmentResponse("rejected")).toBe("rejected");
    expect(() => parseServiceJobAssessmentResponse("pending")).toThrowError(
      expect.objectContaining({ code: "INVALID_PERSISTED_SERVICE_JOB" }),
    );
  });

  it("accepts privacy-safe event metadata used across operations", () => {
    const examples = [
      { status: "assigned", assignmentCount: 2 },
      {
        status: "approved",
        assessmentId: "assessment-1",
        response: "approved",
      },
      {
        status: "invoiced",
        documentId: "document-1",
        documentKind: "invoice",
        documentStatus: "issued",
        emergencyOverride: false,
      },
      {
        status: "in_progress",
        movementId: "move-1",
        partId: "part-1",
        quantity: 2,
      },
      {
        status: "handed_off",
        signatureCaptured: true,
        emergencyOverride: false,
      },
      { status: "waiting_parts", targetStatus: "waiting_parts" },
    ] as const;

    for (const metadata of examples) {
      expect(() => validateServiceJobEventMetadata(metadata)).not.toThrow();
    }
  });

  it.each([
    "customerName",
    "taxId",
    "phone",
    "email",
    "address",
    "latitude",
    "longitude",
    "signerName",
    "deliveryNotes",
    "storagePath",
  ])("rejects PII event metadata key %s", (key) => {
    expect(() =>
      validateServiceJobEventMetadata({ [key]: "sensitive" }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_EVENT_METADATA" }));
  });
});
