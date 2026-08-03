import { createHash } from "node:crypto";

import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  BillingDocument,
  BillingDocumentKind,
  ServiceJob,
  ServiceJobAssessment,
  ServiceJobAssignment,
  ServiceJobEvidence,
  ServiceJobStatus,
  ServiceJobWorkType,
} from "@/domain/entities/service-job";
import type {
  InventoryMovement,
  InventoryPart,
} from "@/domain/entities/inventory";
import type { UserId } from "@/domain/value-objects/user-id";
import type { UserRole } from "@/domain/value-objects/user-role";

export type ServiceJobPersistenceErrorCode =
  | "SERVICE_JOB_NOT_FOUND"
  | "SERVICE_JOB_VERSION_CONFLICT"
  | "SERVICE_JOB_CHILD_CONFLICT"
  | "ASSESSMENT_NOT_FOUND"
  | "BILLING_DOCUMENT_NOT_FOUND"
  | "BILLING_DOCUMENT_IMMUTABLE"
  | "INVENTORY_PART_NOT_FOUND"
  | "INVENTORY_VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_PERSISTED_SERVICE_JOB"
  | "INVALID_EVENT_METADATA";

export class ServiceJobPersistenceError extends Error {
  readonly name = "ServiceJobPersistenceError";

  constructor(
    readonly code: ServiceJobPersistenceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export interface ServiceJobLocationSnapshot {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
  readonly capturedAt: Date;
  readonly capturedBy: UserId;
}

export interface ServiceJobChecklistResult {
  readonly id: string;
  readonly label: string;
  readonly result: "pass" | "fail" | "not_applicable";
  readonly notes: string;
}

export interface ServiceJobPartConsumed {
  readonly partId: string;
  readonly quantity: number;
}

export interface ServiceJobActionPerformed {
  readonly code: string;
  readonly description: string;
  readonly laborMinutes: number;
}

export interface ServiceJobExecutionState {
  readonly checkIn: ServiceJobLocationSnapshot | null;
  readonly checkOut: ServiceJobLocationSnapshot | null;
  readonly checklist: readonly ServiceJobChecklistResult[];
  readonly partsConsumed: readonly ServiceJobPartConsumed[];
  readonly serviceActions: readonly ServiceJobActionPerformed[];
  readonly completionNotes: string;
  readonly deliveryNotes: string;
}

export interface ServiceJobEvidenceRecord extends ServiceJobEvidence {
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly capturedAt: Date;
}

export interface ServiceJobRecord {
  readonly job: ServiceJob;
  /** Existing branch accounts are scoped by their warehouse assignment. */
  readonly warehouseId: string | null;
  readonly execution: ServiceJobExecutionState;
}

export interface ServiceJobListItem {
  readonly id: string;
  readonly jobNumber: string;
  readonly workType: ServiceJobWorkType;
  readonly status: ServiceJobStatus;
  readonly title: string;
  readonly customerId: string | null;
  readonly customerName: string;
  readonly warehouseId: string | null;
  readonly assignedTechnicianIds: readonly UserId[];
  readonly leadTechnicianId: UserId | null;
  readonly approvedAssessmentId: string | null;
  readonly latestBillingDocumentId: string | null;
  readonly updatedAt: Date;
  readonly version: number;
}

export interface ServiceJobListCriteria {
  readonly status: ServiceJobStatus | null;
  readonly workType: ServiceJobWorkType | null;
  readonly warehouseId: string | null;
  readonly customerId: string | null;
  readonly assignedTechnicianId: UserId | null;
  readonly limit: number;
}

export interface ServiceJobAssessmentResponse {
  readonly response: "approved" | "rejected";
  readonly responderName: string;
  readonly responseReason: string | null;
  readonly respondedAt: Date;
  readonly responderId: UserId;
}

export interface ServiceJobAssessmentRecord {
  readonly assessment: ServiceJobAssessment;
  readonly customerResponse: ServiceJobAssessmentResponse | null;
}

export interface BillingDocumentRecord extends BillingDocument {
  readonly issueDate: Date;
  readonly dueDate: Date;
  readonly paymentTerms: string;
  readonly department: string;
  readonly salesperson: string;
  readonly emergencyOverrideReason: string | null;
}

export const SERVICE_JOB_OPERATIONS = [
  "service_job.create",
  "service_job.update",
  "service_job.transition",
  "service_job.assignment.replace",
  "service_job.assignment.respond",
  "service_job.check_in",
  "service_job.check_out",
  "service_job.execution.record",
  "service_job.assessment.create",
  "service_job.assessment.approve",
  "service_job.assessment.reject",
  "service_job.billing.issue",
  "service_job.billing.void",
  "service_job.inventory.issue",
  "service_job.handoff",
] as const;

export type ServiceJobOperation = (typeof SERVICE_JOB_OPERATIONS)[number];

export type ServiceJobEventMetadataValue = string | number | boolean | null;

export interface ServiceJobEvent {
  readonly id: string;
  readonly jobId: string;
  readonly operation: ServiceJobOperation;
  readonly actorId: UserId;
  readonly actorRole: UserRole;
  readonly occurredAt: Date;
  readonly correlationId: string;
  readonly metadata: Readonly<Record<string, ServiceJobEventMetadataValue>>;
}

export type ServiceJobIdempotencyResultValue = string | number | boolean | null;

export interface ServiceJobIdempotencyRecord {
  readonly keyHash: string;
  readonly operation: ServiceJobOperation;
  readonly jobId: string;
  readonly payloadHash: string;
  readonly result: Readonly<Record<string, ServiceJobIdempotencyResultValue>>;
  readonly createdAt: Date;
}

export interface ServiceJobDocumentNumberScope {
  readonly fiscalYear: number;
  readonly warehouseId: string | null;
  readonly kind: BillingDocumentKind;
}

const DOCUMENT_KIND_PREFIX: Readonly<Record<BillingDocumentKind, string>> = {
  delivery_note: "DN",
  invoice: "INV",
  tax_invoice: "TAX",
  service_invoice: "SVC",
  parts_invoice: "PRT",
};

export interface ResolvedServiceJobDocumentNumberScope {
  readonly counterId: string;
  readonly displayBranchCode: string;
}

function documentScopeHash(warehouseId: string | null): string {
  return createHash("sha256")
    .update(warehouseId ?? "__HILLKOFF_HEADQUARTERS__", "utf8")
    .digest("hex")
    .toUpperCase();
}

export function resolveServiceJobDocumentNumberScope(
  scope: ServiceJobDocumentNumberScope,
): ResolvedServiceJobDocumentNumberScope {
  const fullHash = documentScopeHash(scope.warehouseId);
  const readablePrefix =
    (scope.warehouseId ?? "HQ")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 12)
      .replace(/-$/g, "") || "BRANCH";
  return {
    counterId: `${scope.fiscalYear}:${scope.kind}:${fullHash}`,
    displayBranchCode: `${readablePrefix}-${fullHash.slice(0, 12)}`,
  };
}

export function formatServiceJobDocumentNumber(
  scope: ServiceJobDocumentNumberScope,
  sequence: number,
): string {
  if (!Number.isSafeInteger(sequence) || sequence <= 0) {
    throw new ServiceJobPersistenceError(
      "INVALID_PERSISTED_SERVICE_JOB",
      "Document sequence must be a positive safe integer.",
    );
  }
  const resolved = resolveServiceJobDocumentNumberScope(scope);
  return `${DOCUMENT_KIND_PREFIX[scope.kind]}-${scope.fiscalYear}-${resolved.displayBranchCode}-${String(sequence).padStart(6, "0")}`;
}

export function serviceJobDocumentNumberReservationId(
  documentNumber: string,
): string {
  return createHash("sha256").update(documentNumber, "utf8").digest("hex");
}

export function parseServiceJobAssessmentResponse(
  value: unknown,
): ServiceJobAssessmentResponse["response"] {
  if (value === "approved" || value === "rejected") return value;
  throw new ServiceJobPersistenceError(
    "INVALID_PERSISTED_SERVICE_JOB",
    "Invalid persisted assessment response.",
  );
}

export const SERVICE_JOB_EVENT_METADATA_KEYS = [
  "status",
  "targetStatus",
  "assignmentCount",
  "assessmentId",
  "documentId",
  "documentKind",
  "documentStatus",
  "movementId",
  "partId",
  "quantity",
  "signatureCaptured",
  "emergencyOverride",
  "response",
] as const;

const SERVICE_JOB_EVENT_METADATA_KEY_SET = new Set<string>(
  SERVICE_JOB_EVENT_METADATA_KEYS,
);

export function validateServiceJobEventMetadata(
  metadata: Readonly<Record<string, unknown>>,
): void {
  for (const [key, value] of Object.entries(metadata)) {
    if (!SERVICE_JOB_EVENT_METADATA_KEY_SET.has(key)) {
      throw new ServiceJobPersistenceError(
        "INVALID_EVENT_METADATA",
        `Event metadata key ${key} is not allowed.`,
      );
    }
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new ServiceJobPersistenceError(
        "INVALID_EVENT_METADATA",
        `Event metadata value ${key} must be scalar.`,
      );
    }
  }
}

/**
 * Typed transaction boundary. Implementations buffer writes until all reads and
 * validations complete so a thrown error cannot leave partial child/audit data.
 */
export interface ServiceJobTransaction {
  getJob(jobId: string): Promise<ServiceJobRecord | null>;
  putJob(record: ServiceJobRecord, expectedVersion: number | null): void;
  replaceAssignments(
    jobId: string,
    assignments: readonly ServiceJobAssignment[],
  ): void;
  putAssignment(jobId: string, assignment: ServiceJobAssignment): void;
  putExecution(jobId: string, execution: ServiceJobExecutionState): void;
  putEvidence(
    jobId: string,
    evidence: readonly ServiceJobEvidenceRecord[],
  ): void;
  getAssessment(
    jobId: string,
    assessmentId: string,
  ): Promise<ServiceJobAssessment | null>;
  listAssessments(
    jobId: string,
    limit: number,
  ): Promise<readonly ServiceJobAssessment[]>;
  createAssessment(assessment: ServiceJobAssessment): void;
  putAssessment(assessment: ServiceJobAssessment): void;
  putAssessmentResponse(
    jobId: string,
    assessmentId: string,
    response: ServiceJobAssessmentResponse,
  ): void;
  getBillingDocument(
    jobId: string,
    documentId: string,
  ): Promise<BillingDocumentRecord | null>;
  listBillingDocuments(
    jobId: string,
    limit: number,
  ): Promise<readonly BillingDocumentRecord[]>;
  createBillingDocument(document: BillingDocumentRecord): void;
  voidBillingDocument(document: BillingDocumentRecord): void;
  getInventoryPart(partId: string): Promise<InventoryPart | null>;
  issueInventory(
    part: InventoryPart,
    movement: InventoryMovement,
    expectedVersion: number,
  ): void;
  getInventoryMovement(movementId: string): Promise<InventoryMovement | null>;
  getIdempotency(keyHash: string): Promise<ServiceJobIdempotencyRecord | null>;
  createIdempotency(record: ServiceJobIdempotencyRecord): void;
  nextDocumentNumber(scope: ServiceJobDocumentNumberScope): Promise<string>;
  reserveDocumentNumber(documentNumber: string): void;
  appendEvent(event: ServiceJobEvent): void;
  appendAudit(audit: AuditLog): void;
}

export interface ServiceJobRepository {
  createId(kind: string): string;
  findById(id: string): Promise<ServiceJobRecord | null>;
  list(
    criteria: ServiceJobListCriteria,
  ): Promise<readonly ServiceJobListItem[]>;
  listAssessments(
    jobId: string,
    limit: number,
  ): Promise<readonly ServiceJobAssessmentRecord[]>;
  listBillingDocuments(
    jobId: string,
    limit: number,
  ): Promise<readonly BillingDocumentRecord[]>;
  listEvents(jobId: string, limit: number): Promise<readonly ServiceJobEvent[]>;
  runInTransaction<T>(
    work: (transaction: ServiceJobTransaction) => Promise<T>,
  ): Promise<T>;
}
