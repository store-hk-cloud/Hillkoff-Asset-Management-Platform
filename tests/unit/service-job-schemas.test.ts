import { describe, expect, it } from "vitest";

import {
  assignmentResponseSchema,
  checkInSchema,
  checkOutSchema,
  createEvidenceSchema,
  createExecutionSchema,
  createServiceJobSchema,
  evidenceSchema,
  executionSchema,
  serviceJobAssignmentSchema,
  serviceJobTransitionSchema,
  updateServiceJobSchema,
} from "@/features/service-jobs/schemas/service-job.schema";
import {
  assessmentResponseSchema,
  createAssessmentSchema,
} from "@/features/service-jobs/schemas/assessment.schema";
import {
  handoffServiceJobSchema,
  issueBillingDocumentSchema,
  voidBillingDocumentSchema,
} from "@/features/service-jobs/schemas/billing.schema";
import {
  feedbackTokenSchema,
  publicFeedbackBodySchema,
  publicFeedbackSchema,
} from "@/features/service-jobs/schemas/feedback.schema";

const isoDate = "2026-08-02T10:15:00.000Z";
const validEvidence = {
  id: "evidence-1",
  category: "after",
  storagePath: "service-jobs/job-1/evidence/evidence-1",
  contentType: "image/jpeg",
  sizeBytes: 1024,
  capturedAt: isoDate,
};

const validIntake = {
  idempotencyKey: "intake-key-12345678",
  workType: "repair",
  fulfillmentMode: "onsite",
  title: "Repair espresso machine",
  description: "Pump pressure is inconsistent.",
  customer: {
    customerId: "customer-1",
    name: "Hillkoff Coffee",
    taxId: "0105551234567",
    group: "enterprise",
    billingAddress: "1 Billing Road, Chiang Mai",
    serviceAddress: "2 Service Road, Chiang Mai",
    primaryPhone: "0812345678",
    secondaryPhone: null,
  },
  contact: {
    name: "Somchai",
    phone: "0899999999",
    extension: null,
    email: "somchai@example.com",
  },
  asset: {
    assetId: "asset-1",
    assetCode: "ESP-001",
    serialNumber: "SN-100",
    equipmentType: "espresso_machine",
    brand: "Hillkoff",
    model: "Pro 2",
    warrantyStatus: "active",
    warrantyExpiresAt: isoDate,
    repeatRepair: false,
    previousRepairNumber: null,
    includedAccessories: ["portafilter"],
    observedDefects: ["low pressure"],
    additionalRequirements: "Call before arrival",
  },
  termsAcceptedAt: isoDate,
  termsAcceptedBy: "Somchai",
};

describe("service job command schemas", () => {
  it("accepts complete immutable intake snapshots and transforms API dates", () => {
    const result = createServiceJobSchema.parse(validIntake);

    validIntake.customer.name = "Changed after submission";
    validIntake.asset.includedAccessories.push("changed after submission");

    expect(result.termsAcceptedAt).toBeInstanceOf(Date);
    expect(result.asset.warrantyExpiresAt).toBeInstanceOf(Date);
    expect(result.customer.name).toBe("Hillkoff Coffee");
    expect(result.asset.includedAccessories).toEqual(["portafilter"]);

    validIntake.customer.name = "Hillkoff Coffee";
    validIntake.asset.includedAccessories.pop();
  });

  it("rejects incomplete intake snapshots and overlong strings instead of truncating them", () => {
    const missingSnapshot = {
      ...validIntake,
      customer: { ...validIntake.customer, name: "" },
    };
    const overlongTitle = { ...validIntake, title: "x".repeat(201) };

    expect(createServiceJobSchema.safeParse(missingSnapshot).success).toBe(
      false,
    );
    expect(createServiceJobSchema.safeParse(overlongTitle).success).toBe(false);
  });

  it("allows bounded partial updates only", () => {
    expect(
      updateServiceJobSchema.safeParse({
        expectedVersion: 0,
        idempotencyKey: "update-key-12345678",
        title: "Updated title",
        scheduledStartAt: isoDate,
      }).success,
    ).toBe(true);
    expect(
      updateServiceJobSchema.safeParse({ expectedVersion: -1 }).success,
    ).toBe(false);
    expect(
      updateServiceJobSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "update-key-12345678",
        title: "x".repeat(201),
      }).success,
    ).toBe(false);
  });

  it("requires a nonnegative version and ISO date for transitions", () => {
    const parsed = serviceJobTransitionSchema.parse({
      expectedVersion: 2,
      idempotencyKey: "transition-key-12345678",
      targetStatus: "scheduled",
      scheduledStartAt: isoDate,
    });

    expect(parsed.scheduledStartAt).toBeInstanceOf(Date);
    expect(
      serviceJobTransitionSchema.safeParse({
        expectedVersion: -1,
        idempotencyKey: "transition-key-12345678",
        targetStatus: "received",
      }).success,
    ).toBe(false);
    expect(
      serviceJobTransitionSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "transition-key-12345678",
        targetStatus: "scheduled",
        scheduledStartAt: "tomorrow",
      }).success,
    ).toBe(false);
    expect(
      serviceJobTransitionSchema.safeParse({
        expectedVersion: 1,
        targetStatus: "received",
      }).success,
    ).toBe(false);
    expect(
      serviceJobTransitionSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "transition-key-12345678",
        targetStatus: "scheduled",
      }).success,
    ).toBe(false);
    expect(
      serviceJobTransitionSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "transition-key-12345678",
        targetStatus: "received",
        scheduledStartAt: isoDate,
      }).success,
    ).toBe(false);
  });

  it("bounds multi-technician assignment commands and transforms technician IDs at the API boundary", () => {
    const parsed = serviceJobAssignmentSchema.parse({
      expectedVersion: 1,
      idempotencyKey: "0c440f9a-3447-4f58-aed6-2ce2aaac3626",
      assignments: [
        { technicianId: "tech-1", technicianName: "Niran", role: "lead" },
      ],
    });

    expect(parsed.assignments[0]?.technicianId).toBe("tech-1");
    expect(
      serviceJobAssignmentSchema.safeParse({ ...parsed, assignments: [] })
        .success,
    ).toBe(false);
    expect(
      serviceJobAssignmentSchema.safeParse({
        ...parsed,
        assignments: [
          {
            technicianId: "tech-1",
            technicianName: "Niran",
            role: "assistant",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      serviceJobAssignmentSchema.safeParse({
        ...parsed,
        assignments: [
          { technicianId: "tech-1", technicianName: "Niran", role: "lead" },
          { technicianId: "tech-2", technicianName: "Dao", role: "lead" },
        ],
      }).success,
    ).toBe(false);
    expect(
      serviceJobAssignmentSchema.safeParse({
        ...parsed,
        assignments: [
          { technicianId: "tech-1", technicianName: "Niran", role: "lead" },
          {
            technicianId: "tech-1",
            technicianName: "Niran",
            role: "assistant",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      serviceJobAssignmentSchema.safeParse({
        ...parsed,
        assignments: Array.from({ length: 21 }, (_, index) => ({
          technicianId: `tech-${index}`,
          technicianName: "Niran",
          role: "assistant",
        })),
      }).success,
    ).toBe(false);
  });

  it("requires a bounded rejection reason when an assignment is rejected", () => {
    const base = {
      expectedVersion: 1,
      idempotencyKey: "response-key-12345678",
      response: "rejected",
    };

    expect(assignmentResponseSchema.safeParse(base).success).toBe(false);
    expect(
      assignmentResponseSchema.safeParse({
        ...base,
        rejectionReason: "Already assigned elsewhere",
      }).success,
    ).toBe(true);
    expect(
      assignmentResponseSchema.safeParse({
        ...base,
        rejectionReason: "x".repeat(501),
      }).success,
    ).toBe(false);
    expect(
      assignmentResponseSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "response-key-12345678",
        response: "accepted",
        rejectionReason: "not applicable",
      }).success,
    ).toBe(false);
  });

  it("validates check-in and check-out GPS coordinates, accuracy, and timestamps", () => {
    const checkInPayload = {
      expectedVersion: 1,
      idempotencyKey: "check-in-key-12345678",
      latitude: 18.7883,
      longitude: 98.9853,
      accuracyMeters: 8.5,
      capturedAt: isoDate,
    };
    const checkIn = checkInSchema.parse(checkInPayload);

    expect(checkIn.capturedAt).toBeInstanceOf(Date);
    expect(
      checkOutSchema.safeParse({ ...checkInPayload, longitude: 181 }).success,
    ).toBe(false);
    expect(
      checkOutSchema.safeParse({ ...checkInPayload, accuracyMeters: -0.1 })
        .success,
    ).toBe(false);
    expect(
      checkOutSchema.safeParse({
        ...checkInPayload,
        latitude: -90,
        longitude: 180,
      }).success,
    ).toBe(true);
    expect(
      checkOutSchema.safeParse({ ...checkInPayload, latitude: -90.0001 })
        .success,
    ).toBe(false);
  });

  it("binds evidence paths to the API job and evidence IDs", () => {
    const jobEvidenceSchema = createEvidenceSchema("job-1");

    expect(jobEvidenceSchema.safeParse(validEvidence).success).toBe(true);
    expect(
      jobEvidenceSchema.safeParse({
        ...validEvidence,
        storagePath: "service-jobs/job-2/evidence/evidence-1",
      }).success,
    ).toBe(false);
    expect(
      jobEvidenceSchema.safeParse({
        ...validEvidence,
        storagePath: "service-jobs/job-1/evidence/evidence-2",
      }).success,
    ).toBe(false);
    expect(
      jobEvidenceSchema.safeParse({
        ...validEvidence,
        storagePath: "service-jobs/job-1/evidence/evidence-1.jpg",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed evidence namespaces, paths, sizes, and unknown fields", () => {
    expect(
      createEvidenceSchema("job-1").safeParse({
        ...validEvidence,
        storagePath: "service-jobs/job-1/signatures/evidence-1.png",
      }).success,
    ).toBe(false);
    expect(
      evidenceSchema.safeParse({
        ...validEvidence,
        storagePath: "service-jobs/job-1/evidence/../evidence-1",
      }).success,
    ).toBe(false);
    expect(
      evidenceSchema.safeParse({ ...validEvidence, sizeBytes: 0 }).success,
    ).toBe(false);
    expect(
      evidenceSchema.safeParse({ ...validEvidence, sizeBytes: 1.5 }).success,
    ).toBe(false);
    expect(
      evidenceSchema.safeParse({ ...validEvidence, unexpected: true }).success,
    ).toBe(false);
  });

  it("validates execution evidence metadata and bounded work payloads", () => {
    expect(
      executionSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "execution-key-12345678",
        rootCause: "Scale buildup",
        solution: "Descaled and calibrated",
        completionNotes: "Pressure test passed",
        checklist: [
          { id: "pump", label: "Pump test", result: "pass", notes: "9 bar" },
        ],
        evidence: [validEvidence],
        partsConsumed: [{ partId: "part-1", quantity: 2 }],
        serviceActions: [
          {
            code: "DESCALING",
            description: "Descale machine",
            laborMinutes: 30,
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      executionSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "execution-key-12345678",
        rootCause: "",
        solution: "",
        completionNotes: "",
        checklist: [],
        evidence: [
          { ...validEvidence, contentType: "application/x-msdownload" },
        ],
        partsConsumed: [],
        serviceActions: [],
      }).success,
    ).toBe(false);
    expect(
      executionSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "execution-key-12345678",
        rootCause: "cause",
        solution: "solution",
        completionNotes: "",
        checklist: [],
        evidence: [{ ...validEvidence, sizeBytes: 10 * 1024 * 1024 + 1 }],
        partsConsumed: [{ partId: "part-1", quantity: 0 }],
        serviceActions: [],
      }).success,
    ).toBe(false);
  });

  it("binds every execution evidence item to the route job", () => {
    const payload = {
      expectedVersion: 1,
      idempotencyKey: "execution-key-12345678",
      rootCause: "Scale buildup",
      solution: "Descaled and calibrated",
      completionNotes: "Pressure test passed",
      checklist: [],
      evidence: [validEvidence],
      partsConsumed: [],
      serviceActions: [],
    };
    const jobExecutionSchema = createExecutionSchema("job-1");

    expect(jobExecutionSchema.safeParse(payload).success).toBe(true);
    expect(
      jobExecutionSchema.safeParse({
        ...payload,
        evidence: [
          {
            ...validEvidence,
            storagePath: "service-jobs/job-2/evidence/evidence-1",
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("assessment and billing command schemas", () => {
  const validAssessment = {
    expectedVersion: 1,
    idempotencyKey: "assessment-key-12345678",
    evaluatorId: "evaluator-1",
    lines: [
      {
        id: "line-1",
        code: "LABOR",
        type: "service",
        description: "Labor charge",
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

  it("accepts bounded assessment lines and charge policy", () => {
    expect(createAssessmentSchema.safeParse(validAssessment).success).toBe(
      true,
    );
    expect(
      createAssessmentSchema.safeParse({
        ...validAssessment,
        policy: { ...validAssessment.policy, kind: "unknown" },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown fields on assessment and billing commands", () => {
    expect(
      createAssessmentSchema.safeParse({
        ...validAssessment,
        unexpected: true,
      }).success,
    ).toBe(false);
    expect(
      issueBillingDocumentSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "billing-issue-key-12345678",
        assessmentId: "assessment-1",
        kind: "service_invoice",
        issueDate: isoDate,
        dueDate: isoDate,
        paymentTerms: "Net 30",
        department: "Service",
        salesperson: "Aree",
        unexpected: true,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid financial boundaries and a 100 percent discount without a reason", () => {
    expect(
      createAssessmentSchema.safeParse({
        ...validAssessment,
        policy: { ...validAssessment.policy, vatBasisPoints: 10001 },
      }).success,
    ).toBe(false);
    expect(
      createAssessmentSchema.safeParse({
        ...validAssessment,
        lines: [{ ...validAssessment.lines[0], quantity: 0 }],
      }).success,
    ).toBe(false);
    expect(
      createAssessmentSchema.safeParse({
        ...validAssessment,
        lines: [{ ...validAssessment.lines[0], unitPriceSatang: -1 }],
      }).success,
    ).toBe(false);
    expect(
      createAssessmentSchema.safeParse({
        ...validAssessment,
        lines: [{ ...validAssessment.lines[0], discountBasisPoints: 10000 }],
      }).success,
    ).toBe(false);
    expect(
      createAssessmentSchema.safeParse({
        ...validAssessment,
        lines: [
          {
            ...validAssessment.lines[0],
            discountBasisPoints: 10000,
            discountReason: "Warranty approval",
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      createAssessmentSchema.safeParse({
        ...validAssessment,
        lines: [
          {
            ...validAssessment.lines[0],
            quantity: 2,
            unitPriceSatang: Number.MAX_SAFE_INTEGER,
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      createAssessmentSchema.safeParse({
        ...validAssessment,
        policy: {
          vatBasisPoints: 0,
          withholdingBasisPoints: 10000,
          depositBasisPoints: 10000,
        },
      }).success,
    ).toBe(false);
  });

  it("limits assessment line counts and validates customer response identifiers", () => {
    expect(
      createAssessmentSchema.safeParse({
        ...validAssessment,
        lines: Array.from({ length: 101 }, () => validAssessment.lines[0]),
      }).success,
    ).toBe(false);
    expect(
      assessmentResponseSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "approval-key-12345678",
        response: "approved",
        responderName: "Somchai",
        respondedAt: isoDate,
      }).success,
    ).toBe(true);
    expect(
      assessmentResponseSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "approval-key-12345678",
        response: "approved",
        responderName: "Somchai",
        responseReason: "not applicable",
        respondedAt: isoDate,
      }).success,
    ).toBe(false);
    expect(
      assessmentResponseSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "approval-key-12345678",
        response: "rejected",
        responderName: "Somchai",
        respondedAt: isoDate,
      }).success,
    ).toBe(false);
    expect(
      assessmentResponseSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "approval-key-12345678",
        response: "rejected",
        responderName: "Somchai",
        respondedAt: "not-a-date",
      }).success,
    ).toBe(false);
  });

  it("requires idempotency keys for immutable billing issue and void operations", () => {
    const issue = {
      expectedVersion: 1,
      idempotencyKey: "billing-issue-key-12345678",
      assessmentId: "assessment-1",
      kind: "service_invoice",
      issueDate: isoDate,
      dueDate: isoDate,
      paymentTerms: "Net 30",
      department: "Service",
      salesperson: "Aree",
    };

    const parsedIssue = issueBillingDocumentSchema.parse(issue);
    expect(parsedIssue.issueDate).toBeInstanceOf(Date);
    expect(parsedIssue.dueDate).toBeInstanceOf(Date);
    expect(
      issueBillingDocumentSchema.safeParse({
        ...issue,
        idempotencyKey: "short",
      }).success,
    ).toBe(false);
    expect(
      issueBillingDocumentSchema.safeParse({
        ...issue,
        dueDate: "2026-08-01T10:15:00.000Z",
      }).success,
    ).toBe(false);
    expect(
      voidBillingDocumentSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "billing-void-key-12345678",
        reason: "Incorrect tax details",
      }).success,
    ).toBe(true);
    expect(
      voidBillingDocumentSchema.safeParse({
        expectedVersion: 1,
        idempotencyKey: "billing-void-key-12345678",
        reason: "",
      }).success,
    ).toBe(false);
  });

  it("requires exactly one customer signature snapshot or bounded override reason for handoff", () => {
    const base = { expectedVersion: 1, idempotencyKey: "handoff-key-12345678" };

    expect(handoffServiceJobSchema.safeParse(base).success).toBe(false);
    const signature = {
      signerName: "Somchai",
      storagePath: "service-jobs/job-1/signatures/signature-1.png",
      signedAt: isoDate,
    };
    const parsed = handoffServiceJobSchema.parse({
      ...base,
      customerSignature: signature,
    });

    expect(parsed.customerSignature?.signedAt).toBeInstanceOf(Date);
    expect(
      handoffServiceJobSchema.safeParse({
        ...base,
        overrideReason: "Customer unavailable; approved by admin.",
      }).success,
    ).toBe(true);
    expect(
      handoffServiceJobSchema.safeParse({
        ...base,
        customerSignature: signature,
        overrideReason: "Must not be accepted with a signature.",
      }).success,
    ).toBe(false);
  });

  it("accepts only alphanumeric, underscore, or hyphen PNG signature filenames", () => {
    const base = { expectedVersion: 1, idempotencyKey: "handoff-key-12345678" };
    const signature = {
      signerName: "Somchai",
      signedAt: isoDate,
    };

    expect(
      handoffServiceJobSchema.safeParse({
        ...base,
        customerSignature: {
          ...signature,
          storagePath: "service-jobs/job-1/signatures/Az_09-signature.png",
        },
      }).success,
    ).toBe(true);

    for (const storagePath of [
      "service-jobs/job-1/signatures/signature.bad.png",
      "service-jobs/job-1/signatures/signature%2Fbad.png",
      "service-jobs/job-1/signatures/../signature.png",
      "service-jobs/job-1/signatures/signature.jpg",
    ]) {
      expect(
        handoffServiceJobSchema.safeParse({
          ...base,
          customerSignature: { ...signature, storagePath },
        }).success,
        storagePath,
      ).toBe(false);
    }
  });
});

describe("public feedback schema", () => {
  const validFeedbackBody = {
    serviceScore: 5,
    technicianScore: 4,
    timelinessScore: 5,
    comment: "Excellent service",
  };
  const validFeedbackToken = "KZKPRY8KmhQqFfZn0NmVPPV7b7TwTZpb";

  it("separates the feedback path token from the strict public request body", () => {
    expect(feedbackTokenSchema.safeParse(validFeedbackToken).success).toBe(
      true,
    );
    expect(publicFeedbackBodySchema.safeParse(validFeedbackBody).success).toBe(
      true,
    );
    expect(
      publicFeedbackBodySchema.safeParse({
        ...validFeedbackBody,
        token: validFeedbackToken,
      }).success,
    ).toBe(false);
    expect(
      publicFeedbackSchema.safeParse({
        token: validFeedbackToken,
        ...validFeedbackBody,
      }).success,
    ).toBe(true);
  });

  it("accepts an opaque token and bounded service feedback without customer lookup fields", () => {
    expect(
      publicFeedbackSchema.safeParse({
        token: validFeedbackToken,
        ...validFeedbackBody,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid feedback scores, token length, PII lookup fields, and long comments", () => {
    expect(
      publicFeedbackSchema.safeParse({
        token: "short",
        serviceScore: 5,
        technicianScore: 4,
        timelinessScore: 5,
        comment: "ok",
      }).success,
    ).toBe(false);
    expect(
      publicFeedbackSchema.safeParse({
        token: "KZKPRY8KmhQqFfZn0NmVPPV7b7TwTZpb",
        serviceScore: 6,
        technicianScore: 4,
        timelinessScore: 5,
        comment: "ok",
      }).success,
    ).toBe(false);
    expect(
      publicFeedbackSchema.safeParse({
        token: "KZKPRY8KmhQqFfZn0NmVPPV7b7TwTZpb",
        serviceScore: 5,
        technicianScore: 4,
        timelinessScore: 5,
        comment: "x".repeat(2001),
      }).success,
    ).toBe(false);
    expect(
      publicFeedbackSchema.safeParse({
        token: "KZKPRY8KmhQqFfZn0NmVPPV7b7TwTZpb",
        serviceScore: 5,
        technicianScore: 4,
        timelinessScore: 5,
        comment: "ok",
        customerId: "customer-1",
      }).success,
    ).toBe(false);
  });
});
