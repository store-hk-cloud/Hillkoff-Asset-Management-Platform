import { describe, expect, it } from "vitest";

import type {
  CreateServiceJobAssessmentInput,
  CreateServiceJobInput,
  ServiceJob,
  ServiceJobAssignmentInput,
  ServiceJobStatus,
} from "@/domain/entities/service-job";
import { ServiceJobError } from "@/domain/errors/service-job.error";
import { ServiceJobDomainService } from "@/domain/services/service-job-domain.service";
import { createUserId } from "@/domain/value-objects/user-id";

const service = new ServiceJobDomainService();
const coordinatorId = createUserId("coordinator-1");
const leadTechnicianId = createUserId("technician-lead");
const assistantTechnicianId = createUserId("technician-assistant");
const now = new Date("2026-08-02T09:00:00.000Z");

function intake(
  overrides: Partial<CreateServiceJobInput> = {},
): CreateServiceJobInput {
  return {
    workType: "repair",
    fulfillmentMode: "onsite",
    title: "  Water leak inspection  ",
    description: "  Customer reports water below the machine.  ",
    customer: {
      customerId: "customer-1",
      name: "Hillkoff Coffee",
      taxId: "0105555555555",
      group: "B2B",
      billingAddress: "1 Coffee Road, Chiang Mai",
      serviceAddress: "2 Service Road, Chiang Mai",
      primaryPhone: "0812345678",
      secondaryPhone: null,
    },
    contact: {
      name: "Pim Customer",
      phone: "0812345678",
      extension: null,
      email: "pim@example.com",
    },
    asset: {
      assetId: "asset-1",
      assetCode: "HK-001",
      serialNumber: "SN-001",
      equipmentType: "Espresso machine",
      brand: "Hillkoff",
      model: "HX-2",
      warrantyStatus: "active",
      warrantyExpiresAt: new Date("2027-01-01T00:00:00.000Z"),
      repeatRepair: false,
      previousRepairNumber: null,
      includedAccessories: ["Portafilter"],
      observedDefects: [],
      additionalRequirements: "Call before arrival",
    },
    termsAcceptedAt: now,
    termsAcceptedBy: "Pim Customer",
    ...overrides,
  };
}

function assignments(
  overrides: readonly ServiceJobAssignmentInput[] = [],
): readonly ServiceJobAssignmentInput[] {
  return [
    {
      technicianId: leadTechnicianId,
      technicianName: "Lead Technician",
      role: "lead",
    },
    ...overrides,
  ];
}

function createJob(): ServiceJob {
  return service.create("service-job-1", intake(), coordinatorId, now);
}

function schedule(job: ServiceJob): ServiceJob {
  const received = service.transition(
    job,
    { expectedVersion: job.version, targetStatus: "received" },
    coordinatorId,
    now,
  );
  return service.transition(
    received,
    {
      expectedVersion: received.version,
      targetStatus: "scheduled",
      scheduledStartAt: new Date("2026-08-03T09:00:00.000Z"),
    },
    coordinatorId,
    now,
  );
}

function inProgress(job: ServiceJob): ServiceJob {
  const scheduled = schedule(job);
  const assigned = service.assign(
    scheduled,
    { expectedVersion: scheduled.version, assignments: assignments() },
    coordinatorId,
    now,
  );
  return service.transition(
    assigned,
    { expectedVersion: assigned.version, targetStatus: "in_progress" },
    leadTechnicianId,
    now,
  );
}

function assessmentInput(
  expectedVersion: number,
): CreateServiceJobAssessmentInput {
  return {
    id: "assessment-1",
    expectedVersion,
    revision: 1,
    evaluatorId: coordinatorId,
    lines: [
      {
        id: "line-1",
        code: "SERVICE",
        type: "service",
        description: "On-site diagnosis",
        unit: "job",
        quantity: 1,
        unitPriceSatang: 200000,
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
      depositBasisPoints: 3000,
    },
  };
}

function expectServiceJobErrorCode(
  action: () => unknown,
  code: ServiceJobError["code"],
): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ServiceJobError);
    expect((error as ServiceJobError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ServiceJobError with code ${code}.`);
}

describe("ServiceJobDomainService", () => {
  it("creates an immutable intake snapshot with normalized work details", () => {
    const job = createJob();

    expect(job.status).toBe("draft");
    expect(job.title).toBe("Water leak inspection");
    expect(job.description).toBe("Customer reports water below the machine.");
    expect(job.customer.name).toBe("Hillkoff Coffee");
    expect(job.asset.serialNumber).toBe("SN-001");
    expect(job.version).toBe(0);
  });

  it("isolates intake snapshots from later source mutations", () => {
    const source = intake({
      termsAcceptedAt: new Date("2026-08-02T09:00:00.000Z"),
    });
    const job = service.create(
      "service-job-snapshot",
      source,
      coordinatorId,
      now,
    );
    const mutableSource = source as unknown as {
      customer: { name: string };
      contact: { phone: string };
      asset: {
        includedAccessories: string[];
        observedDefects: string[];
        warrantyExpiresAt: Date | null;
      };
      termsAcceptedAt: Date;
    };

    mutableSource.customer.name = "Changed customer";
    mutableSource.contact.phone = "0000000000";
    mutableSource.asset.includedAccessories.push("Water filter");
    mutableSource.asset.observedDefects.push("Scratch");
    mutableSource.asset.warrantyExpiresAt?.setUTCFullYear(2030);
    mutableSource.termsAcceptedAt.setUTCFullYear(2030);

    expect(job.customer.name).toBe("Hillkoff Coffee");
    expect(job.contact.phone).toBe("0812345678");
    expect(job.asset.includedAccessories).toEqual(["Portafilter"]);
    expect(job.asset.observedDefects).toEqual([]);
    expect(job.asset.warrantyExpiresAt?.getUTCFullYear()).toBe(2027);
    expect(job.termsAcceptedAt.getUTCFullYear()).toBe(2026);
  });

  it("permits the lifecycle through execution and rejects skipped transitions", () => {
    const job = createJob();

    expectServiceJobErrorCode(
      () =>
        service.transition(
          job,
          { expectedVersion: 0, targetStatus: "completed" },
          coordinatorId,
          now,
        ),
      "SERVICE_JOB_TRANSITION_PROTECTED",
    );

    expect(inProgress(job).status).toBe("in_progress");
  });

  it("rejects generic transition bypasses for protected lifecycle targets", () => {
    const cases: readonly {
      readonly job: ServiceJob;
      readonly targetStatus: ServiceJobStatus;
    }[] = [
      {
        job: { ...createJob(), status: "scheduled", version: 1 },
        targetStatus: "assigned",
      },
      {
        job: { ...createJob(), status: "in_progress", version: 1 },
        targetStatus: "completed",
      },
      {
        job: { ...createJob(), status: "assessment_pending", version: 1 },
        targetStatus: "approved",
      },
      {
        job: { ...createJob(), status: "approved", version: 1 },
        targetStatus: "invoiced",
      },
      {
        job: { ...createJob(), status: "invoiced", version: 1 },
        targetStatus: "handed_off",
      },
    ];

    for (const { job, targetStatus } of cases) {
      expectServiceJobErrorCode(
        () =>
          service.transition(
            job,
            { expectedVersion: job.version, targetStatus },
            coordinatorId,
            now,
          ),
        "SERVICE_JOB_TRANSITION_PROTECTED",
      );
    }
  });

  it("requires a schedule time and isolates scheduling timestamps", () => {
    const eventNow = new Date("2026-08-02T09:00:00.000Z");
    const received = service.transition(
      createJob(),
      { expectedVersion: 0, targetStatus: "received" },
      coordinatorId,
      eventNow,
    );

    expectServiceJobErrorCode(
      () =>
        service.transition(
          received,
          { expectedVersion: received.version, targetStatus: "scheduled" },
          coordinatorId,
          eventNow,
        ),
      "SCHEDULED_START_REQUIRED",
    );

    const scheduledStartAt = new Date("2026-08-03T09:00:00.000Z");
    const scheduled = service.transition(
      received,
      {
        expectedVersion: received.version,
        targetStatus: "scheduled",
        scheduledStartAt,
      },
      coordinatorId,
      eventNow,
    );
    scheduledStartAt.setUTCFullYear(2030);
    eventNow.setUTCFullYear(2030);

    expect(scheduled.scheduledStartAt?.getUTCFullYear()).toBe(2026);
    expect(scheduled.updatedAt.getUTCFullYear()).toBe(2026);
    expect(scheduled.scheduledStartAt).not.toBe(scheduledStartAt);
    expect(scheduled.updatedAt).not.toBe(eventNow);
  });

  it("keeps ordinary waiting, cancellation, and closing transitions available", () => {
    const current = inProgress(createJob());
    const waiting = service.transition(
      current,
      { expectedVersion: current.version, targetStatus: "waiting_parts" },
      leadTechnicianId,
      now,
    );
    const resumed = service.transition(
      waiting,
      { expectedVersion: waiting.version, targetStatus: "in_progress" },
      leadTechnicianId,
      now,
    );
    const cancelled = service.transition(
      createJob(),
      { expectedVersion: 0, targetStatus: "cancelled" },
      coordinatorId,
      now,
    );
    const handedOff = service.handoff(
      { ...createJob(), status: "invoiced", version: 4 },
      {
        expectedVersion: 4,
        customerSignature: {
          signerName: "Pim Customer",
          storagePath: "service-jobs/service-job-1/signatures/signature-1.png",
          signedAt: now,
        },
        overrideReason: null,
      },
      coordinatorId,
      now,
    );
    const closed = service.transition(
      handedOff,
      { expectedVersion: handedOff.version, targetStatus: "closed" },
      coordinatorId,
      now,
    );

    expect(resumed.status).toBe("in_progress");
    expect(cancelled.status).toBe("cancelled");
    expect(closed.status).toBe("closed");
  });

  it("requires exactly one lead when assigning multiple technicians", () => {
    const scheduled = schedule(createJob());

    expectServiceJobErrorCode(
      () =>
        service.assign(
          scheduled,
          {
            expectedVersion: scheduled.version,
            assignments: [
              {
                technicianId: leadTechnicianId,
                technicianName: "Lead One",
                role: "lead",
              },
              {
                technicianId: assistantTechnicianId,
                technicianName: "Lead Two",
                role: "lead",
              },
            ],
          },
          coordinatorId,
          now,
        ),
      "ASSIGNMENT_LEAD_REQUIRED",
    );

    const assigned = service.assign(
      scheduled,
      {
        expectedVersion: scheduled.version,
        assignments: assignments([
          {
            technicianId: assistantTechnicianId,
            technicianName: "Assistant Technician",
            role: "assistant",
          },
        ]),
      },
      coordinatorId,
      now,
    );

    expect(assigned.leadTechnicianId).toBe(leadTechnicianId);
    expect(assigned.assignments).toHaveLength(2);
  });

  it("rejects an assignment with no lead technician", () => {
    const scheduled = schedule(createJob());

    expectServiceJobErrorCode(
      () =>
        service.assign(
          scheduled,
          {
            expectedVersion: scheduled.version,
            assignments: [
              {
                technicianId: assistantTechnicianId,
                technicianName: "Assistant Technician",
                role: "assistant",
              },
            ],
          },
          coordinatorId,
          now,
        ),
      "ASSIGNMENT_LEAD_REQUIRED",
    );
  });

  it("rejects duplicate technicians in an assignment", () => {
    const scheduled = schedule(createJob());

    expectServiceJobErrorCode(
      () =>
        service.assign(
          scheduled,
          {
            expectedVersion: scheduled.version,
            assignments: [
              {
                technicianId: leadTechnicianId,
                technicianName: "Lead Technician",
                role: "lead",
              },
              {
                technicianId: leadTechnicianId,
                technicianName: "Duplicate Technician",
                role: "assistant",
              },
            ],
          },
          coordinatorId,
          now,
        ),
      "ASSIGNMENT_DUPLICATE_TECHNICIAN",
    );
  });

  it("rejects a blank technician name", () => {
    const scheduled = schedule(createJob());

    expectServiceJobErrorCode(
      () =>
        service.assign(
          scheduled,
          {
            expectedVersion: scheduled.version,
            assignments: [
              {
                technicianId: leadTechnicianId,
                technicianName: "   ",
                role: "lead",
              },
            ],
          },
          coordinatorId,
          now,
        ),
      "ASSIGNMENT_NAME_REQUIRED",
    );
  });

  it("preserves accepted assignment state while replacing rejected and pending assignments", () => {
    const assigned = service.assign(
      schedule(createJob()),
      {
        expectedVersion: 2,
        assignments: assignments([
          {
            technicianId: assistantTechnicianId,
            technicianName: "Accepted Assistant",
            role: "assistant",
          },
        ]),
      },
      coordinatorId,
      now,
    );
    const acceptedAt = new Date("2026-08-02T10:00:00.000Z");
    const rejectedAt = new Date("2026-08-02T10:05:00.000Z");
    const stateAfterResponses: ServiceJob = {
      ...assigned,
      assignments: assigned.assignments.map((item) =>
        item.technicianId === assistantTechnicianId
          ? {
              ...item,
              status: "accepted",
              respondedAt: acceptedAt,
              laborMinutes: 95,
            }
          : {
              ...item,
              status: "rejected",
              respondedAt: rejectedAt,
              rejectionReason: "Unavailable",
            },
      ),
      version: assigned.version + 2,
    };
    const replacementLeadId = createUserId("technician-replacement");

    const reassigned = service.assign(
      stateAfterResponses,
      {
        expectedVersion: stateAfterResponses.version,
        assignments: [
          {
            technicianId: replacementLeadId,
            technicianName: "Replacement Lead",
            role: "lead",
          },
        ],
      },
      coordinatorId,
      new Date("2026-08-02T11:00:00.000Z"),
    );

    expect(reassigned.assignments).toHaveLength(2);
    expect(reassigned.assignments).toContainEqual(
      expect.objectContaining({
        technicianId: assistantTechnicianId,
        status: "accepted",
        role: "assistant",
        laborMinutes: 95,
        respondedAt: acceptedAt,
      }),
    );
    expect(reassigned.assignments).toContainEqual(
      expect.objectContaining({
        technicianId: replacementLeadId,
        status: "pending",
        role: "lead",
        laborMinutes: 0,
      }),
    );
    expect(reassigned.assignments).not.toContainEqual(
      expect.objectContaining({ technicianId: leadTechnicianId }),
    );
    expect(reassigned.leadTechnicianId).toBe(replacementLeadId);
  });

  it("requires execution evidence before completion", () => {
    const current = inProgress(createJob());

    expectServiceJobErrorCode(
      () =>
        service.complete(
          current,
          {
            expectedVersion: current.version,
            rootCause: "Loose connector",
            solution: "Tightened connector",
            evidence: [],
          },
          leadTechnicianId,
          now,
        ),
      "COMPLETION_EVIDENCE_REQUIRED",
    );

    const completed = service.complete(
      current,
      {
        expectedVersion: current.version,
        rootCause: "Loose connector",
        solution: "Tightened connector",
        evidence: [
          {
            id: "evidence-1",
            category: "after",
            storagePath: "service-jobs/service-job-1/evidence/evidence-1",
            uploadedBy: leadTechnicianId,
            uploadedAt: now,
          },
        ],
      },
      leadTechnicianId,
      now,
    );

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toEqual(now);
  });

  it("isolates completion evidence and event timestamps", () => {
    const current = inProgress(createJob());
    const completedAt = new Date("2026-08-04T09:00:00.000Z");
    const evidence = {
      id: "evidence-1",
      category: "after" as const,
      storagePath: "service-jobs/service-job-1/evidence/evidence-1",
      uploadedBy: leadTechnicianId,
      uploadedAt: new Date("2026-08-04T08:00:00.000Z"),
    };
    const completed = service.complete(
      current,
      {
        expectedVersion: current.version,
        rootCause: "Loose connector",
        solution: "Tightened connector",
        evidence: [evidence],
      },
      leadTechnicianId,
      completedAt,
    );

    evidence.storagePath = "changed";
    evidence.uploadedAt.setUTCFullYear(2030);
    completedAt.setUTCFullYear(2030);

    expect(completed.evidence[0]?.storagePath).toContain("evidence-1");
    expect(completed.evidence[0]?.uploadedAt.getUTCFullYear()).toBe(2026);
    expect(completed.completedAt?.getUTCFullYear()).toBe(2026);
    expect(completed.updatedAt.getUTCFullYear()).toBe(2026);
    expect(completed.version).toBe(current.version + 1);
  });

  it("creates an isolated assessment snapshot and advances the job version", () => {
    const current = inProgress(createJob());
    const pending = service.transition(
      current,
      { expectedVersion: current.version, targetStatus: "assessment_pending" },
      leadTechnicianId,
      now,
    );
    const source = assessmentInput(pending.version);
    const created = service.createAssessment(
      pending,
      source,
      coordinatorId,
      now,
    );
    const mutableSource = source as unknown as {
      lines: { description: string; unitPriceSatang: number }[];
      policy: { vatBasisPoints: number };
    };

    mutableSource.lines[0]!.description = "Changed service";
    mutableSource.lines[0]!.unitPriceSatang = 1;
    mutableSource.policy.vatBasisPoints = 0;

    expect(created.job.version).toBe(pending.version + 1);
    expect(created.job.updatedBy).toBe(coordinatorId);
    expect(created.assessment.lines[0]?.description).toBe("On-site diagnosis");
    expect(created.assessment.lines[0]?.unitPriceSatang).toBe(200000);
    expect(created.assessment.policy.vatBasisPoints).toBe(700);
    expect(created.assessment.totals.vatSatang).toBe(14000);
  });

  it("accepts a positive server-derived assessment revision and rejects unsafe revisions", () => {
    const current = inProgress(createJob());
    const pending = service.transition(
      current,
      { expectedVersion: current.version, targetStatus: "assessment_pending" },
      leadTechnicianId,
      now,
    );

    const created = service.createAssessment(
      pending,
      { ...assessmentInput(pending.version), revision: 7 },
      coordinatorId,
      now,
    );
    expect(created.assessment.revision).toBe(7);

    expectServiceJobErrorCode(
      () =>
        service.createAssessment(
          pending,
          { ...assessmentInput(pending.version), revision: 0 },
          coordinatorId,
          now,
        ),
      "ASSESSMENT_STATUS_INVALID",
    );
  });

  it("returns an isolated approved assessment snapshot", () => {
    const current = inProgress(createJob());
    const pending = service.transition(
      current,
      { expectedVersion: current.version, targetStatus: "assessment_pending" },
      leadTechnicianId,
      now,
    );
    const created = service.createAssessment(
      pending,
      assessmentInput(pending.version),
      coordinatorId,
      now,
    );
    const approvalNow = new Date("2026-08-05T09:00:00.000Z");
    const approved = service.approveAssessment(
      created.job,
      created.assessment,
      { expectedVersion: created.job.version, approverId: coordinatorId },
      coordinatorId,
      approvalNow,
    );
    const mutableCreated = created.assessment as unknown as {
      lines: { description: string }[];
      policy: { vatBasisPoints: number };
      totals: { vatSatang: number };
      createdAt: Date;
    };

    mutableCreated.lines[0]!.description = "Changed after approval";
    mutableCreated.policy.vatBasisPoints = 0;
    mutableCreated.totals.vatSatang = 0;
    mutableCreated.createdAt.setUTCFullYear(2030);
    approvalNow.setUTCFullYear(2030);

    expect(approved.assessment.lines[0]?.description).toBe("On-site diagnosis");
    expect(approved.assessment.policy.vatBasisPoints).toBe(700);
    expect(approved.assessment.totals.vatSatang).toBe(14000);
    expect(approved.assessment.createdAt.getUTCFullYear()).toBe(2026);
    expect(approved.assessment.approvedAt?.getUTCFullYear()).toBe(2026);
    expect(approved.job.updatedAt.getUTCFullYear()).toBe(2026);
    expect(approved.job.version).toBe(created.job.version + 1);
  });

  it("rejects stale assessment creation", () => {
    const current = inProgress(createJob());
    const pending = service.transition(
      current,
      { expectedVersion: current.version, targetStatus: "assessment_pending" },
      leadTechnicianId,
      now,
    );

    expectServiceJobErrorCode(
      () =>
        service.createAssessment(
          pending,
          assessmentInput(pending.version - 1),
          coordinatorId,
          now,
        ),
      "SERVICE_JOB_VERSION_CONFLICT",
    );
  });

  it("issues one billing document from an approved assessment and advances the job", () => {
    const current = inProgress(createJob());
    const pending = service.transition(
      current,
      { expectedVersion: current.version, targetStatus: "assessment_pending" },
      leadTechnicianId,
      now,
    );
    const created = service.createAssessment(
      pending,
      assessmentInput(pending.version),
      coordinatorId,
      now,
    );

    expectServiceJobErrorCode(
      () =>
        service.createBillingDocument(
          created.job,
          created.assessment,
          {
            id: "bill-1",
            expectedVersion: created.job.version,
            kind: "service_invoice",
            documentNumber: "SVC-1",
          },
          coordinatorId,
          now,
        ),
      "BILLING_JOB_STATUS_INVALID",
    );

    const approved = service.approveAssessment(
      created.job,
      created.assessment,
      { expectedVersion: created.job.version, approverId: coordinatorId },
      coordinatorId,
      now,
    );
    expectServiceJobErrorCode(
      () =>
        service.approveAssessment(
          created.job,
          { ...created.assessment, jobId: "another-service-job" },
          { expectedVersion: created.job.version, approverId: coordinatorId },
          coordinatorId,
          now,
        ),
      "ASSESSMENT_JOB_MISMATCH",
    );
    expectServiceJobErrorCode(
      () =>
        service.createBillingDocument(
          approved.job,
          { ...approved.assessment, jobId: "another-service-job" },
          {
            id: "bill-1",
            expectedVersion: approved.job.version,
            kind: "service_invoice",
            documentNumber: "SVC-1",
          },
          coordinatorId,
          now,
        ),
      "ASSESSMENT_JOB_MISMATCH",
    );
    expectServiceJobErrorCode(
      () =>
        service.createBillingDocument(
          approved.job,
          approved.assessment,
          {
            id: "bill-1",
            expectedVersion: approved.job.version - 1,
            kind: "service_invoice",
            documentNumber: "SVC-1",
          },
          coordinatorId,
          now,
        ),
      "SERVICE_JOB_VERSION_CONFLICT",
    );

    const billed = service.createBillingDocument(
      approved.job,
      approved.assessment,
      {
        id: "bill-1",
        expectedVersion: approved.job.version,
        kind: "service_invoice",
        documentNumber: "SVC-1",
      },
      coordinatorId,
      now,
    );
    const mutableAssessment = approved.assessment as unknown as {
      lines: { description: string; unitPriceSatang: number }[];
      policy: { vatBasisPoints: number };
    };
    const mutableJob = approved.job as unknown as {
      customer: { name: string };
      contact: { phone: string };
      asset: {
        includedAccessories: string[];
        warrantyExpiresAt: Date | null;
      };
    };

    mutableAssessment.lines[0]!.description = "Changed after issue";
    mutableAssessment.lines[0]!.unitPriceSatang = 1;
    mutableAssessment.policy.vatBasisPoints = 0;
    mutableJob.customer.name = "Changed customer";
    mutableJob.contact.phone = "0000000000";
    mutableJob.asset.includedAccessories.push("Water filter");
    mutableJob.asset.warrantyExpiresAt?.setUTCFullYear(2030);

    expect(approved.assessment.status).toBe("approved");
    expect(billed.job.status).toBe("invoiced");
    expect(billed.job.version).toBe(approved.job.version + 1);
    expect(billed.document.status).toBe("issued");
    expect(billed.document.policy).toEqual({
      kind: "out_of_warranty",
      vatBasisPoints: 700,
      withholdingBasisPoints: 300,
      depositBasisPoints: 3000,
    });
    expect(billed.document.lines[0]?.description).toBe("On-site diagnosis");
    expect(billed.document.lines[0]?.unitPriceSatang).toBe(200000);
    expect(billed.document.totals.vatSatang).toBe(14000);
    expect(billed.document.customer.name).toBe("Hillkoff Coffee");
    expect(billed.document.contact.phone).toBe("0812345678");
    expect(billed.document.asset.includedAccessories).toEqual(["Portafilter"]);
    expect(billed.document.asset.warrantyExpiresAt?.getUTCFullYear()).toBe(
      2027,
    );
  });

  it("issues distinct service and parts documents from one approved assessment while invoiced", () => {
    const current = inProgress(createJob());
    const pending = service.transition(
      current,
      { expectedVersion: current.version, targetStatus: "assessment_pending" },
      leadTechnicianId,
      now,
    );
    const source = assessmentInput(pending.version);
    const created = service.createAssessment(
      pending,
      {
        ...source,
        lines: [
          ...source.lines,
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
      },
      coordinatorId,
      now,
    );
    const approved = service.approveAssessment(
      created.job,
      created.assessment,
      { expectedVersion: created.job.version, approverId: coordinatorId },
      coordinatorId,
      now,
    );
    const serviceDocument = service.createBillingDocument(
      approved.job,
      approved.assessment,
      {
        id: "bill-service",
        expectedVersion: approved.job.version,
        kind: "service_invoice",
        documentNumber: "SVC-1",
      },
      coordinatorId,
      now,
    );
    const partsDocument = service.createBillingDocument(
      serviceDocument.job,
      approved.assessment,
      {
        id: "bill-parts",
        expectedVersion: serviceDocument.job.version,
        kind: "parts_invoice",
        documentNumber: "PRT-1",
      },
      coordinatorId,
      now,
    );

    expect(serviceDocument.document.lines).toHaveLength(1);
    expect(serviceDocument.document.lines[0]?.type).toBe("service");
    expect(partsDocument.document.lines).toHaveLength(1);
    expect(partsDocument.document.lines[0]?.type).toBe("part");
    expect(partsDocument.job.status).toBe("invoiced");
  });

  it("rejects an empty filtered billing document", () => {
    const current = inProgress(createJob());
    const pending = service.transition(
      current,
      { expectedVersion: current.version, targetStatus: "assessment_pending" },
      leadTechnicianId,
      now,
    );
    const created = service.createAssessment(
      pending,
      assessmentInput(pending.version),
      coordinatorId,
      now,
    );
    const approved = service.approveAssessment(
      created.job,
      created.assessment,
      { expectedVersion: created.job.version, approverId: coordinatorId },
      coordinatorId,
      now,
    );

    expectServiceJobErrorCode(
      () =>
        service.createBillingDocument(
          approved.job,
          approved.assessment,
          {
            id: "bill-empty-parts",
            expectedVersion: approved.job.version,
            kind: "parts_invoice",
            documentNumber: "PRT-1",
          },
          coordinatorId,
          now,
        ),
      "INVALID_MONEY_VALUE",
    );
  });

  it("allows billing only from approved or completed jobs", () => {
    const current = inProgress(createJob());
    const pending = service.transition(
      current,
      { expectedVersion: current.version, targetStatus: "assessment_pending" },
      leadTechnicianId,
      now,
    );
    const created = service.createAssessment(
      pending,
      assessmentInput(pending.version),
      coordinatorId,
      now,
    );
    const approved = service.approveAssessment(
      created.job,
      created.assessment,
      { expectedVersion: created.job.version, approverId: coordinatorId },
      coordinatorId,
      now,
    );
    const completed = service.complete(
      approved.job,
      {
        expectedVersion: approved.job.version,
        rootCause: "Loose connector",
        solution: "Tightened connector",
        evidence: [
          {
            id: "evidence-1",
            category: "after",
            storagePath: "service-jobs/service-job-1/evidence/evidence-1",
            uploadedBy: leadTechnicianId,
            uploadedAt: now,
          },
        ],
      },
      leadTechnicianId,
      now,
    );
    const billed = service.createBillingDocument(
      completed,
      approved.assessment,
      {
        id: "bill-1",
        expectedVersion: completed.version,
        kind: "service_invoice",
        documentNumber: "SVC-1",
      },
      coordinatorId,
      now,
    );

    expect(billed.document.status).toBe("issued");
  });

  it("rejects billing from terminal jobs with a billing-specific error", () => {
    const current = inProgress(createJob());
    const pending = service.transition(
      current,
      { expectedVersion: current.version, targetStatus: "assessment_pending" },
      leadTechnicianId,
      now,
    );
    const created = service.createAssessment(
      pending,
      assessmentInput(pending.version),
      coordinatorId,
      now,
    );
    const approved = service.approveAssessment(
      created.job,
      created.assessment,
      { expectedVersion: created.job.version, approverId: coordinatorId },
      coordinatorId,
      now,
    );

    for (const status of ["closed", "cancelled"] as const) {
      expectServiceJobErrorCode(
        () =>
          service.createBillingDocument(
            { ...approved.job, status },
            approved.assessment,
            {
              id: `bill-${status}`,
              expectedVersion: approved.job.version,
              kind: "service_invoice",
              documentNumber: `SVC-${status}`,
            },
            coordinatorId,
            now,
          ),
        "BILLING_JOB_TERMINAL",
      );
    }
  });

  it("requires a customer signature or documented override for handoff", () => {
    const job = { ...createJob(), status: "invoiced" as const, version: 4 };

    expectServiceJobErrorCode(
      () =>
        service.handoff(
          job,
          { expectedVersion: 4, customerSignature: null, overrideReason: null },
          coordinatorId,
          now,
        ),
      "HANDOFF_ACKNOWLEDGEMENT_REQUIRED",
    );

    const signed = service.handoff(
      job,
      {
        expectedVersion: 4,
        customerSignature: {
          signerName: "Pim Customer",
          storagePath: "service-jobs/service-job-1/signatures/signature-1.png",
          signedAt: now,
        },
        overrideReason: null,
      },
      coordinatorId,
      now,
    );
    expect(signed.status).toBe("handed_off");
    expect(signed.handoffSignature?.signerName).toBe("Pim Customer");

    const handedOff = service.handoff(
      job,
      {
        expectedVersion: 4,
        customerSignature: null,
        overrideReason:
          "Customer was unavailable; manager authorized delivery.",
      },
      coordinatorId,
      now,
    );
    expect(handedOff.status).toBe("handed_off");
  });

  it("isolates the full handoff signature snapshot and advances the version", () => {
    const job = { ...createJob(), status: "invoiced" as const, version: 4 };
    const signature = {
      signerName: "Pim Customer",
      storagePath: "service-jobs/service-job-1/signatures/signature-1.png",
      signedAt: new Date("2026-08-06T08:00:00.000Z"),
    };
    const handedOff = service.handoff(
      job,
      {
        expectedVersion: job.version,
        customerSignature: signature,
        overrideReason: null,
      },
      coordinatorId,
      now,
    );

    signature.signerName = "Changed signer";
    signature.storagePath = "changed";
    signature.signedAt.setUTCFullYear(2030);

    expect(handedOff.handoffSignature).toMatchObject({
      signerName: "Pim Customer",
      storagePath: "service-jobs/service-job-1/signatures/signature-1.png",
    });
    expect(handedOff.handoffSignature?.signedAt.getUTCFullYear()).toBe(2026);
    expect(handedOff.version).toBe(job.version + 1);
  });

  it("returns a fresh allowed-transition array on every call", () => {
    const first = service.allowedTransitions("draft") as ServiceJobStatus[];

    first.splice(0, first.length, "approved");

    expect(service.allowedTransitions("draft")).toEqual([
      "received",
      "cancelled",
    ]);
  });

  it("rejects every transition from closed and cancelled jobs", () => {
    const invoiced = {
      ...createJob(),
      status: "invoiced" as const,
      version: 4,
    };
    const handedOff = service.handoff(
      invoiced,
      {
        expectedVersion: invoiced.version,
        customerSignature: {
          signerName: "Pim Customer",
          storagePath: "service-jobs/service-job-1/signatures/signature-1.png",
          signedAt: now,
        },
        overrideReason: null,
      },
      coordinatorId,
      now,
    );
    const closed = service.transition(
      handedOff,
      { expectedVersion: handedOff.version, targetStatus: "closed" },
      coordinatorId,
      now,
    );
    const cancelled = service.transition(
      createJob(),
      { expectedVersion: 0, targetStatus: "cancelled" },
      coordinatorId,
      now,
    );

    expectServiceJobErrorCode(
      () =>
        service.transition(
          closed,
          { expectedVersion: closed.version, targetStatus: "received" },
          coordinatorId,
          now,
        ),
      "SERVICE_JOB_TERMINAL",
    );
    expectServiceJobErrorCode(
      () =>
        service.transition(
          cancelled,
          { expectedVersion: cancelled.version, targetStatus: "received" },
          coordinatorId,
          now,
        ),
      "SERVICE_JOB_TERMINAL",
    );
  });
});
