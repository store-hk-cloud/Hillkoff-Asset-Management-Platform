import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUserId } from "@/domain/value-objects/user-id";

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  isTrustedMutationRequest: vi.fn(),
  checkRateLimit: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn() },
  service: {
    get: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
    assign: vi.fn(),
    respondToAssignment: vi.fn(),
    checkIn: vi.fn(),
    checkOut: vi.fn(),
    recordExecution: vi.fn(),
    createAssessment: vi.fn(),
    approveAssessment: vi.fn(),
    rejectAssessment: vi.fn(),
    issueBillingDocument: vi.fn(),
    voidBillingDocument: vi.fn(),
    handoff: vi.fn(),
  },
  feedback: {
    rateLimitKey: vi.fn(),
    isAvailable: vi.fn(),
    submit: vi.fn(),
  },
}));

// @ts-expect-error Vitest supports virtual modules at runtime.
vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/lib/auth/dal", () => ({
  getCurrentSession: mocks.getCurrentSession,
}));
vi.mock("@/lib/auth/mutation-security", () => ({
  isTrustedMutationRequest: mocks.isTrustedMutationRequest,
}));
vi.mock("@/lib/logging/logger", () => ({ logger: mocks.logger }));
vi.mock("@/lib/rate-limit/rate-limiter", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));
vi.mock("@/lib/service-jobs/service", () => ({
  serviceJobManagementService: mocks.service,
  publicServiceJobFeedback: mocks.feedback,
}));

const profile = {
  id: createUserId("admin-1"),
  uid: createUserId("admin-1"),
  email: "admin@example.com",
  displayName: "Admin",
  phoneNumber: null,
  photoURL: null,
  role: "admin" as const,
  status: "active" as const,
  warehouseId: null,
  customerId: null,
  lastLoginAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  version: 1,
};

const IDEMPOTENCY_KEY = "route-test-key-0001";
const JOB_ID = "job_1";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/service-jobs", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function params<T extends Record<string, string>>(value: T) {
  return { params: Promise.resolve(value) };
}

function allServiceMocks() {
  return Object.values(mocks.service);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentSession.mockResolvedValue({ profile });
  mocks.isTrustedMutationRequest.mockResolvedValue(true);
  mocks.checkRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
  mocks.feedback.rateLimitKey.mockImplementation(
    (_token: string, action: string) => `feedback:${action}:stable-hash`,
  );
  mocks.feedback.isAvailable.mockResolvedValue(true);
  mocks.feedback.submit.mockResolvedValue(true);
  for (const serviceMock of allServiceMocks()) {
    serviceMock.mockResolvedValue({ id: "result-1" });
  }
});

describe("route parameter gate", () => {
  const invalidCases = [
    {
      name: "job GET",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/route")).GET,
      ids: { jobId: "../secret" },
    },
    {
      name: "assignment create",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/assignments/route")).POST,
      ids: { jobId: "../secret" },
    },
    {
      name: "assignment response",
      load: async () =>
        (
          await import("@/app/api/service-jobs/[jobId]/assignments/[assignmentId]/respond/route")
        ).POST,
      ids: { jobId: JOB_ID, assignmentId: "bad/id" },
    },
    {
      name: "check-in",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/check-in/route")).POST,
      ids: { jobId: "bad id" },
    },
    {
      name: "check-out",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/check-out/route")).POST,
      ids: { jobId: "bad.id" },
    },
    {
      name: "execution",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/execution/route")).POST,
      ids: { jobId: "%2e%2e" },
    },
    {
      name: "assessment create",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/assessments/route")).POST,
      ids: { jobId: "job#1" },
    },
    {
      name: "assessment response",
      load: async () =>
        (
          await import("@/app/api/service-jobs/[jobId]/assessments/[assessmentId]/respond/route")
        ).POST,
      ids: { jobId: JOB_ID, assessmentId: "assessment.raw" },
    },
    {
      name: "billing issue",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/billing-documents/route"))
          .POST,
      ids: { jobId: "job?1" },
    },
    {
      name: "billing void",
      load: async () =>
        (
          await import("@/app/api/service-jobs/[jobId]/billing-documents/[documentId]/void/route")
        ).POST,
      ids: { jobId: JOB_ID, documentId: "../document" },
    },
    {
      name: "handoff",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/handoff/route")).POST,
      ids: { jobId: "job 1" },
    },
  ] as const;

  it.each(invalidCases)(
    "rejects invalid IDs before auth, CSRF, service, and raw-path logging: $name",
    async ({ load, ids }) => {
      mocks.isTrustedMutationRequest.mockResolvedValue(false);
      const handler = await load();
      const response = await handler(request({}), params(ids) as never);

      expect(response.status).toBe(422);
      expect(mocks.isTrustedMutationRequest).not.toHaveBeenCalled();
      expect(mocks.getCurrentSession).not.toHaveBeenCalled();
      for (const serviceMock of allServiceMocks()) {
        expect(serviceMock).not.toHaveBeenCalled();
      }
      expect(JSON.stringify(mocks.logger.warn.mock.calls)).not.toContain(
        Object.values(ids).find((value) => value !== JOB_ID),
      );
    },
  );
});

describe("authenticated handler families", () => {
  const invalidPayloadCases = [
    {
      name: "PATCH update/transition",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/route")).PATCH,
      ids: { jobId: JOB_ID },
      service: mocks.service.update,
    },
    {
      name: "assignment",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/assignments/route")).POST,
      ids: { jobId: JOB_ID },
      service: mocks.service.assign,
    },
    {
      name: "assignment response",
      load: async () =>
        (
          await import("@/app/api/service-jobs/[jobId]/assignments/[assignmentId]/respond/route")
        ).POST,
      ids: { jobId: JOB_ID, assignmentId: "assignment_1" },
      service: mocks.service.respondToAssignment,
    },
    {
      name: "check-in",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/check-in/route")).POST,
      ids: { jobId: JOB_ID },
      service: mocks.service.checkIn,
    },
    {
      name: "check-out",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/check-out/route")).POST,
      ids: { jobId: JOB_ID },
      service: mocks.service.checkOut,
    },
    {
      name: "execution",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/execution/route")).POST,
      ids: { jobId: JOB_ID },
      service: mocks.service.recordExecution,
    },
    {
      name: "assessment",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/assessments/route")).POST,
      ids: { jobId: JOB_ID },
      service: mocks.service.createAssessment,
    },
    {
      name: "assessment response",
      load: async () =>
        (
          await import("@/app/api/service-jobs/[jobId]/assessments/[assessmentId]/respond/route")
        ).POST,
      ids: { jobId: JOB_ID, assessmentId: "assessment_1" },
      service: mocks.service.approveAssessment,
    },
    {
      name: "billing issue",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/billing-documents/route"))
          .POST,
      ids: { jobId: JOB_ID },
      service: mocks.service.issueBillingDocument,
    },
    {
      name: "billing void",
      load: async () =>
        (
          await import("@/app/api/service-jobs/[jobId]/billing-documents/[documentId]/void/route")
        ).POST,
      ids: { jobId: JOB_ID, documentId: "document_1" },
      service: mocks.service.voidBillingDocument,
    },
    {
      name: "handoff",
      load: async () =>
        (await import("@/app/api/service-jobs/[jobId]/handoff/route")).POST,
      ids: { jobId: JOB_ID },
      service: mocks.service.handoff,
    },
  ] as const;

  it.each(invalidPayloadCases)(
    "validates $name payload before service dispatch",
    async ({ load, ids }) => {
      const handler = await load();
      const response = await handler(request({}), params(ids) as never);

      expect(response.status).toBe(422);
      for (const serviceMock of allServiceMocks()) {
        expect(serviceMock).not.toHaveBeenCalled();
      }
    },
  );

  it("dispatches assignment and response only after valid schemas", async () => {
    const assignments =
      await import("@/app/api/service-jobs/[jobId]/assignments/route");
    const respond =
      await import("@/app/api/service-jobs/[jobId]/assignments/[assignmentId]/respond/route");

    expect(
      (
        await assignments.POST(
          request({
            expectedVersion: 1,
            idempotencyKey: IDEMPOTENCY_KEY,
            assignments: [
              {
                technicianId: "tech_1",
                technicianName: "Tech",
                role: "lead",
              },
            ],
          }),
          params({ jobId: JOB_ID }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await respond.POST(
          request({
            expectedVersion: 2,
            idempotencyKey: IDEMPOTENCY_KEY,
            response: "accepted",
          }),
          params({ jobId: JOB_ID, assignmentId: "assignment_1" }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.service.assign).toHaveBeenCalledTimes(1);
    expect(mocks.service.respondToAssignment).toHaveBeenCalledTimes(1);
  });

  it("dispatches check-in and check-out only after valid schemas", async () => {
    const checkIn =
      await import("@/app/api/service-jobs/[jobId]/check-in/route");
    const checkOut =
      await import("@/app/api/service-jobs/[jobId]/check-out/route");
    const body = {
      expectedVersion: 1,
      idempotencyKey: IDEMPOTENCY_KEY,
      latitude: 18.7883,
      longitude: 98.9853,
      accuracyMeters: 5,
      capturedAt: "2026-08-02T12:00:00.000Z",
    };

    expect(
      (await checkIn.POST(request(body), params({ jobId: JOB_ID }))).status,
    ).toBe(200);
    expect(
      (await checkOut.POST(request(body), params({ jobId: JOB_ID }))).status,
    ).toBe(200);
    expect(mocks.service.checkIn).toHaveBeenCalledTimes(1);
    expect(mocks.service.checkOut).toHaveBeenCalledTimes(1);
  });

  it("binds execution evidence to the route job before service dispatch", async () => {
    const execution =
      await import("@/app/api/service-jobs/[jobId]/execution/route");
    const base = {
      expectedVersion: 1,
      idempotencyKey: IDEMPOTENCY_KEY,
      rootCause: "Blocked valve",
      solution: "Cleaned valve",
      completionNotes: "Complete",
      checklist: [],
      partsConsumed: [],
      serviceActions: [],
    };
    const invalid = await execution.POST(
      request({
        ...base,
        evidence: [
          {
            id: "photo_1",
            category: "after",
            storagePath: "service-jobs/job_2/evidence/photo_1.png",
            contentType: "image/png",
            sizeBytes: 100,
            capturedAt: "2026-08-02T12:00:00.000Z",
          },
        ],
      }),
      params({ jobId: JOB_ID }),
    );
    expect(invalid.status).toBe(422);
    expect(mocks.service.recordExecution).not.toHaveBeenCalled();

    const valid = await execution.POST(
      request({ ...base, evidence: [] }),
      params({ jobId: JOB_ID }),
    );
    expect(valid.status).toBe(200);
    expect(mocks.service.recordExecution).toHaveBeenCalledTimes(1);
  });

  it("dispatches assessment creation and response after validation", async () => {
    const assessments =
      await import("@/app/api/service-jobs/[jobId]/assessments/route");
    const respond =
      await import("@/app/api/service-jobs/[jobId]/assessments/[assessmentId]/respond/route");
    const assessmentBody = {
      expectedVersion: 1,
      idempotencyKey: IDEMPOTENCY_KEY,
      evaluatorId: "admin_1",
      lines: [
        {
          id: "line_1",
          code: "LABOR",
          type: "service",
          description: "Service",
          unit: "job",
          quantity: 1,
          unitPriceSatang: 10000,
          discountBasisPoints: 0,
          discountReason: null,
          warehouseId: null,
          warrantyMonths: 0,
        },
      ],
      policy: {
        kind: "out_of_warranty",
        vatBasisPoints: 700,
        withholdingBasisPoints: 0,
        depositBasisPoints: 0,
      },
    };
    expect(
      (
        await assessments.POST(
          request(assessmentBody),
          params({ jobId: JOB_ID }),
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await respond.POST(
          request({
            expectedVersion: 2,
            idempotencyKey: IDEMPOTENCY_KEY,
            response: "approved",
            responderName: "Customer",
            respondedAt: "2026-08-02T12:00:00.000Z",
          }),
          params({ jobId: JOB_ID, assessmentId: "assessment_1" }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.service.createAssessment).toHaveBeenCalledTimes(1);
    expect(mocks.service.approveAssessment).toHaveBeenCalledTimes(1);
  });

  it("dispatches billing issue and void after validation", async () => {
    const billing =
      await import("@/app/api/service-jobs/[jobId]/billing-documents/route");
    const voidRoute =
      await import("@/app/api/service-jobs/[jobId]/billing-documents/[documentId]/void/route");
    expect(
      (
        await billing.POST(
          request({
            expectedVersion: 1,
            idempotencyKey: IDEMPOTENCY_KEY,
            assessmentId: "assessment_1",
            kind: "invoice",
            issueDate: "2026-08-02T12:00:00.000Z",
            dueDate: "2026-08-09T12:00:00.000Z",
            paymentTerms: "7 days",
            department: "Service",
            salesperson: "Sales",
          }),
          params({ jobId: JOB_ID }),
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await voidRoute.POST(
          request({
            expectedVersion: 2,
            idempotencyKey: IDEMPOTENCY_KEY,
            reason: "Incorrect document",
          }),
          params({ jobId: JOB_ID, documentId: "document_1" }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.service.issueBillingDocument).toHaveBeenCalledTimes(1);
    expect(mocks.service.voidBillingDocument).toHaveBeenCalledTimes(1);
  });

  it("rejects cross-job handoff signatures and accepts the strict current-job path", async () => {
    const handoff =
      await import("@/app/api/service-jobs/[jobId]/handoff/route");
    const body = {
      expectedVersion: 1,
      idempotencyKey: IDEMPOTENCY_KEY,
      customerSignature: {
        signerName: "Customer",
        signedAt: "2026-08-02T12:00:00.000Z",
      },
      deliveryNotes: "Delivered",
    };
    const invalid = await handoff.POST(
      request({
        ...body,
        customerSignature: {
          ...body.customerSignature,
          storagePath: "service-jobs/job_2/signatures/signature_1.png",
        },
      }),
      params({ jobId: JOB_ID }),
    );
    expect(invalid.status).toBe(422);
    expect(mocks.service.handoff).not.toHaveBeenCalled();

    const valid = await handoff.POST(
      request({
        ...body,
        customerSignature: {
          ...body.customerSignature,
          storagePath: "service-jobs/job_1/signatures/signature_1.png",
        },
      }),
      params({ jobId: JOB_ID }),
    );
    expect(valid.status).toBe(200);
    expect(mocks.service.handoff).toHaveBeenCalledTimes(1);
  });

  it("separates PATCH update and transition schemas", async () => {
    const route = await import("@/app/api/service-jobs/[jobId]/route");
    expect(
      (
        await route.PATCH(
          request({
            expectedVersion: 1,
            idempotencyKey: IDEMPOTENCY_KEY,
            title: "Updated",
          }),
          params({ jobId: JOB_ID }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await route.PATCH(
          request({
            expectedVersion: 2,
            idempotencyKey: IDEMPOTENCY_KEY,
            targetStatus: "in_progress",
          }),
          params({ jobId: JOB_ID }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.service.update).toHaveBeenCalledTimes(1);
    expect(mocks.service.transition).toHaveBeenCalledTimes(1);
  });

  it("checks CSRF before session and returns 403 then 401", async () => {
    const assignments =
      await import("@/app/api/service-jobs/[jobId]/assignments/route");
    mocks.isTrustedMutationRequest.mockResolvedValueOnce(false);
    const csrf = await assignments.POST(request({}), params({ jobId: JOB_ID }));
    expect(csrf.status).toBe(403);
    expect(mocks.getCurrentSession).not.toHaveBeenCalled();

    mocks.isTrustedMutationRequest.mockResolvedValueOnce(true);
    mocks.getCurrentSession.mockResolvedValueOnce(null);
    const auth = await assignments.POST(request({}), params({ jobId: JOB_ID }));
    expect(auth.status).toBe(401);
  });
});

describe("public feedback boundary", () => {
  it("keys rate limits to token hash/action, ignoring forwarded-IP changes", async () => {
    const route = await import("@/app/api/public/feedback/[token]/route");
    const token = "a".repeat(32);
    const first = await route.GET(
      new Request("https://example.test", {
        headers: { "x-forwarded-for": "198.51.100.1" },
      }),
      params({ token }),
    );
    const second = await route.GET(
      new Request("https://example.test", {
        headers: { "x-forwarded-for": "203.0.113.99" },
      }),
      params({ token }),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const firstKey = mocks.checkRateLimit.mock.calls[0]?.[0];
    const secondKey = mocks.checkRateLimit.mock.calls[1]?.[0];
    expect(firstKey).toBe("feedback:read:stable-hash");
    expect(secondKey).toBe(firstKey);
    expect(firstKey).not.toContain("198.51.100.1");
    await expect(first.json()).resolves.toEqual({
      success: true,
      data: { available: true },
      correlationId: expect.any(String),
    });
  });

  it("validates feedback POST before submission and preserves single-use result", async () => {
    const route = await import("@/app/api/public/feedback/[token]/route");
    const token = "b".repeat(32);
    const invalid = await route.POST(
      request({ serviceScore: 6 }),
      params({ token }),
    );
    expect(invalid.status).toBe(422);
    expect(mocks.feedback.submit).not.toHaveBeenCalled();

    const body = {
      serviceScore: 5,
      technicianScore: 5,
      timelinessScore: 4,
      comment: "Good",
    };
    mocks.feedback.submit
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const first = await route.POST(request(body), params({ token }));
    const replay = await route.POST(request(body), params({ token }));
    expect(first.status).toBe(201);
    expect(replay.status).toBe(404);
  });
});
