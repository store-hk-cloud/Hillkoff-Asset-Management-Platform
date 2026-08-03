import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ServiceJobError } from "@/domain/errors/service-job.error";
import { ServiceJobPersistenceError } from "@/domain/repositories/service-job.repository";
import { ServiceJobAccessError } from "@/domain/services/service-job-access.service";
import { createUserId } from "@/domain/value-objects/user-id";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { logger } from "@/lib/logging/logger";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import {
  createServiceJobContext,
  parseServiceJobJson,
  serviceJobErrorResponse,
  serviceJobSuccessResponse,
} from "@/lib/service-jobs/route-utils";
import {
  publicServiceJobFeedback,
  serviceJobManagementService,
} from "@/lib/service-jobs/service";

// @ts-expect-error Vitest supports virtual modules at runtime.
vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("@/lib/logging/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));
vi.mock("@/lib/auth/dal", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/auth/mutation-security", () => ({
  isTrustedMutationRequest: vi.fn(),
}));
vi.mock("@/lib/rate-limit/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  clientIp: vi.fn(() => "203.0.113.5"),
}));
vi.mock("@/lib/service-jobs/service", () => ({
  serviceJobManagementService: {
    create: vi.fn(),
  },
  publicServiceJobFeedback: {
    rateLimitKey: vi.fn(
      (_token: string, action: string) =>
        `service-feedback:${action}:${"a".repeat(64)}`,
    ),
    isAvailable: vi.fn(),
    submit: vi.fn(),
  },
}));

const profile = {
  id: createUserId("user-1"),
  uid: createUserId("user-1"),
  email: "user@example.com",
  displayName: "User",
  phoneNumber: null,
  photoURL: null,
  role: "branch" as const,
  status: "active" as const,
  warehouseId: "warehouse-1",
  customerId: null,
  lastLoginAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  version: 1,
};

describe("service-job route utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentSession).mockResolvedValue({ profile });
    vi.mocked(isTrustedMutationRequest).mockResolvedValue(true);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      retryAfterMs: 0,
    });
  });

  it("creates a trusted context without copying request payload data", () => {
    const request = new Request("https://example.test/api/service-jobs", {
      headers: {
        "user-agent": "vitest",
        "x-forwarded-for": "203.0.113.5, 10.0.0.1",
      },
    });

    const context = createServiceJobContext(request, profile, "correlation-1");

    expect(context).toEqual({
      actor: profile,
      correlationId: "correlation-1",
      ipAddress: "203.0.113.5",
      userAgent: "vitest",
    });
  });

  it("returns normalized successful JSON with a correlation ID", async () => {
    const response = serviceJobSuccessResponse(
      { id: "job-1" },
      "correlation-1",
      201,
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { id: "job-1" },
      correlationId: "correlation-1",
    });
  });

  it("parses JSON through the supplied strict schema", async () => {
    const schema = z.object({ value: z.string() }).strict();
    const request = new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ value: "ok" }),
    });

    await expect(parseServiceJobJson(request, schema)).resolves.toEqual({
      value: "ok",
    });
  });

  it.each([
    [
      new ServiceJobAccessError("SERVICE_JOB_ACCESS_DENIED", "private"),
      403,
      "SERVICE_JOB_ACCESS_DENIED",
    ],
    [
      new ServiceJobPersistenceError("SERVICE_JOB_NOT_FOUND", "private"),
      404,
      "SERVICE_JOB_NOT_FOUND",
    ],
    [
      new ServiceJobPersistenceError("IDEMPOTENCY_CONFLICT", "private"),
      409,
      "IDEMPOTENCY_CONFLICT",
    ],
    [
      new ServiceJobPersistenceError("SERVICE_JOB_VERSION_CONFLICT", "private"),
      409,
      "SERVICE_JOB_VERSION_CONFLICT",
    ],
    [
      new ServiceJobError("INVALID_MONEY_VALUE", "private"),
      422,
      "INVALID_MONEY_VALUE",
    ],
    [
      z.object({ value: z.string() }).safeParse({ value: 1 }).error,
      422,
      "VALIDATION_ERROR",
    ],
  ])("maps a safe public error response", async (error, status, code) => {
    const response = serviceJobErrorResponse(error, {
      correlationId: "correlation-1",
      operation: "service_job.test",
      jobId: "job-1",
    });

    expect(response.status).toBe(status);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code,
        message: expect.any(String),
      },
      correlationId: "correlation-1",
    });
    expect(JSON.stringify(body)).not.toContain("private");
  });

  it("maps authentication failures without logging sensitive context", async () => {
    const response = serviceJobErrorResponse(
      new ServiceJobAccessError("SERVICE_JOB_ACCESS_DENIED", "private"),
      {
        correlationId: "correlation-1",
        operation: "service_job.get",
        authenticationFailure: true,
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTHENTICATION_REQUIRED" },
    });
  });

  it("logs only allowlisted route metadata for an unhandled error", async () => {
    const response = serviceJobErrorResponse(new Error("secret payload"), {
      correlationId: "correlation-1",
      operation: "service_job.billing.void",
      jobId: "job-1",
      documentId: "document-1",
    });

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      "Unhandled service job request error",
      { name: "Error" },
      {
        correlationId: "correlation-1",
        operation: "service_job.billing.void",
        jobId: "job-1",
        documentId: "document-1",
      },
    );
    const loggedMetadata = vi.mocked(logger.error).mock.calls[0]?.[2];
    expect(loggedMetadata).not.toHaveProperty("customer");
    expect(loggedMetadata).not.toHaveProperty("taxId");
    expect(loggedMetadata).not.toHaveProperty("latitude");
    expect(loggedMetadata).not.toHaveProperty("signature");
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
      },
      correlationId: "correlation-1",
    });
  });
});

describe("service-job route boundaries", () => {
  const validCreatePayload = {
    idempotencyKey: "create-job-key-0001",
    workType: "repair" as const,
    fulfillmentMode: "onsite" as const,
    title: "Repair espresso machine",
    description: "Machine has low pressure.",
    customer: {
      customerId: "customer-1",
      name: "Customer",
      taxId: null,
      group: null,
      billingAddress: "Billing address",
      serviceAddress: "Service address",
      primaryPhone: "0000000000",
      secondaryPhone: null,
    },
    contact: {
      name: "Contact",
      phone: "0000000000",
      extension: null,
      email: null,
    },
    asset: {
      assetId: null,
      assetCode: null,
      serialNumber: null,
      equipmentType: "Espresso machine",
      brand: "Hillkoff",
      model: "Enterprise",
      warrantyStatus: "unknown" as const,
      warrantyExpiresAt: null,
      repeatRepair: false,
      previousRepairNumber: null,
      includedAccessories: [],
      observedDefects: [],
      additionalRequirements: "",
    },
    termsAcceptedAt: "2026-08-02T12:00:00.000Z",
    termsAcceptedBy: "Customer",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentSession).mockResolvedValue({ profile });
    vi.mocked(isTrustedMutationRequest).mockResolvedValue(true);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      retryAfterMs: 0,
    });
  });

  it("validates intake before calling the service and derives warehouse scope from session", async () => {
    vi.mocked(serviceJobManagementService.create).mockResolvedValue({
      job: { id: "job-1" },
    } as never);
    const { POST } = await import("@/app/api/service-jobs/route");
    const response = await POST(
      new Request("https://example.test/api/service-jobs", {
        method: "POST",
        body: JSON.stringify(validCreatePayload),
      }),
    );

    expect(response.status).toBe(201);
    expect(serviceJobManagementService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Repair espresso machine",
        warehouseId: "warehouse-1",
      }),
      expect.objectContaining({ actor: profile }),
    );
  });

  it("rejects client-supplied warehouse ownership before service invocation", async () => {
    const { POST } = await import("@/app/api/service-jobs/route");
    const response = await POST(
      new Request("https://example.test/api/service-jobs", {
        method: "POST",
        body: JSON.stringify({
          ...validCreatePayload,
          warehouseId: "attacker-controlled",
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(serviceJobManagementService.create).not.toHaveBeenCalled();
  });

  it("keeps the public feedback token in the path only", async () => {
    const { POST } = await import("@/app/api/public/feedback/[token]/route");
    const response = await POST(
      new Request("https://example.test/api/public/feedback/token", {
        method: "POST",
        body: JSON.stringify({
          token: "body-token-that-must-not-be-accepted",
          serviceScore: 5,
          technicianScore: 5,
          timelinessScore: 5,
          comment: "Good",
        }),
      }),
      {
        params: Promise.resolve({ token: "a".repeat(32) }),
      },
    );

    expect(response.status).toBe(422);
    expect(publicServiceJobFeedback.submit).not.toHaveBeenCalled();
  });
});
