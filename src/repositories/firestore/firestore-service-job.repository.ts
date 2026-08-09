import "server-only";

import {
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Query,
  type Transaction,
} from "firebase-admin/firestore";

import type { AuditLog } from "@/domain/entities/audit-log";
import {
  SERVICE_JOB_CHARGE_POLICY_KINDS,
  SERVICE_JOB_STATUSES,
  SERVICE_JOB_WORK_TYPES,
  type ServiceJob,
  type ServiceJobAssessment,
  type ServiceJobAssessmentLine,
  type ServiceJobAssignment,
  type ServiceJobAssetSnapshot,
  type ServiceJobChargePolicy,
  type ServiceJobContactSnapshot,
  type ServiceJobCustomerSnapshot,
  type ServiceJobEvidence,
  type ServiceJobStatus,
  type ServiceJobWorkType,
} from "@/domain/entities/service-job";
import type {
  InventoryMovement,
  InventoryPart,
} from "@/domain/entities/inventory";
import {
  formatServiceJobDocumentNumber,
  parseServiceJobAssessmentResponse,
  resolveServiceJobDocumentNumberScope,
  SERVICE_JOB_OPERATIONS,
  serviceJobDocumentNumberReservationId,
  ServiceJobPersistenceError,
  validateServiceJobEventMetadata,
  type BillingDocumentRecord,
  type ServiceJobAssessmentResponse,
  type ServiceJobAssessmentRecord,
  type ServiceJobDocumentNumberScope,
  type ServiceJobEvent,
  type ServiceJobEvidenceRecord,
  type ServiceJobExecutionState,
  type ServiceJobIdempotencyRecord,
  type ServiceJobListCriteria,
  type ServiceJobListItem,
  type ServiceJobRecord,
  type ServiceJobRepository,
  type ServiceJobTransaction,
} from "@/domain/repositories/service-job.repository";
import { calculateAssessmentTotals } from "@/domain/services/service-job-money.service";
import { createUserId, type UserId } from "@/domain/value-objects/user-id";
import { isUserRole } from "@/domain/value-objects/user-role";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

const MAX_ASSIGNMENTS = 20;
const MAX_EVIDENCE = 50;
const MAX_FINANCIAL_LINES = 100;

function requiredString(data: DocumentData, field: string): string {
  const value = data[field];
  if (typeof value !== "string" || !value) {
    throw invalidPersisted(`Invalid service-job field: ${field}.`);
  }
  return value;
}

function optionalString(data: DocumentData, field: string): string | null {
  const value = data[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw invalidPersisted(`Invalid service-job field: ${field}.`);
  }
  return value;
}

function requiredBoolean(data: DocumentData, field: string): boolean {
  const value = data[field];
  if (typeof value !== "boolean") {
    throw invalidPersisted(`Invalid service-job field: ${field}.`);
  }
  return value;
}

function requiredNumber(data: DocumentData, field: string): number {
  const value = data[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw invalidPersisted(`Invalid service-job field: ${field}.`);
  }
  return value;
}

function requiredSafeInteger(data: DocumentData, field: string): number {
  const value = requiredNumber(data, field);
  if (!Number.isSafeInteger(value)) {
    throw invalidPersisted(`Invalid financial field: ${field}.`);
  }
  return value;
}

function requiredNonnegativeSafeInteger(
  data: DocumentData,
  field: string,
): number {
  const value = requiredSafeInteger(data, field);
  if (value < 0) {
    throw invalidPersisted(`Invalid non-negative financial field: ${field}.`);
  }
  return value;
}

function requiredPositiveSafeInteger(
  data: DocumentData,
  field: string,
): number {
  const value = requiredSafeInteger(data, field);
  if (value <= 0) {
    throw invalidPersisted(`Invalid positive financial field: ${field}.`);
  }
  return value;
}

function requirePathIdentity(
  data: DocumentData,
  expectedJobId: string,
  expectedId: string,
): void {
  if (
    requiredString(data, "id") !== expectedId ||
    requiredString(data, "jobId") !== expectedJobId
  ) {
    throw invalidPersisted(
      "Persisted child identity does not match its document path.",
    );
  }
}

function requiredDate(value: unknown, field: string): Date {
  if (!(value instanceof Timestamp)) {
    throw invalidPersisted(`Invalid service-job timestamp: ${field}.`);
  }
  return value.toDate();
}

function optionalDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (!(value instanceof Timestamp)) {
    throw invalidPersisted("Invalid optional service-job timestamp.");
  }
  return value.toDate();
}

function invalidPersisted(message: string): ServiceJobPersistenceError {
  return new ServiceJobPersistenceError(
    "INVALID_PERSISTED_SERVICE_JOB",
    message,
  );
}

function mapStatus(value: unknown): ServiceJobStatus {
  if (
    typeof value === "string" &&
    SERVICE_JOB_STATUSES.some((status) => status === value)
  ) {
    return value as ServiceJobStatus;
  }
  throw invalidPersisted("Invalid service-job status.");
}

function mapWorkType(value: unknown): ServiceJobWorkType {
  if (
    typeof value === "string" &&
    SERVICE_JOB_WORK_TYPES.some((workType) => workType === value)
  ) {
    return value as ServiceJobWorkType;
  }
  throw invalidPersisted("Invalid service-job work type.");
}

function mapCustomer(data: DocumentData): ServiceJobCustomerSnapshot {
  return {
    customerId: optionalString(data, "customerId"),
    name: requiredString(data, "name"),
    taxId: optionalString(data, "taxId"),
    group: optionalString(data, "group"),
    billingAddress: requiredString(data, "billingAddress"),
    serviceAddress: requiredString(data, "serviceAddress"),
    primaryPhone: requiredString(data, "primaryPhone"),
    secondaryPhone: optionalString(data, "secondaryPhone"),
  };
}

function mapContact(data: DocumentData): ServiceJobContactSnapshot {
  return {
    name: requiredString(data, "name"),
    phone: requiredString(data, "phone"),
    extension: optionalString(data, "extension"),
    email: optionalString(data, "email"),
  };
}

function mapAsset(data: DocumentData): ServiceJobAssetSnapshot {
  const warrantyStatus = data.warrantyStatus;
  if (
    warrantyStatus !== "active" &&
    warrantyStatus !== "expired" &&
    warrantyStatus !== "unknown"
  ) {
    throw invalidPersisted("Invalid asset warranty status.");
  }
  return {
    assetId: optionalString(data, "assetId"),
    assetCode: optionalString(data, "assetCode"),
    serialNumber: optionalString(data, "serialNumber"),
    equipmentType: requiredString(data, "equipmentType"),
    brand: requiredString(data, "brand"),
    model: requiredString(data, "model"),
    warrantyStatus,
    warrantyExpiresAt: optionalDate(data.warrantyExpiresAt),
    repeatRepair: data.repeatRepair === true,
    previousRepairNumber: optionalString(data, "previousRepairNumber"),
    includedAccessories: stringArray(data.includedAccessories),
    observedDefects: stringArray(data.observedDefects),
    additionalRequirements:
      typeof data.additionalRequirements === "string"
        ? data.additionalRequirements
        : "",
  };
}

function stringArray(value: unknown): readonly string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw invalidPersisted("Invalid service-job string array.");
  }
  return [...value];
}

function userIdArray(value: unknown): readonly UserId[] {
  return stringArray(value).map(createUserId);
}

function mapAssignment(data: DocumentData): ServiceJobAssignment {
  const status = data.status;
  const role = data.role;
  if (status !== "pending" && status !== "accepted" && status !== "rejected") {
    throw invalidPersisted("Invalid assignment status.");
  }
  if (role !== "lead" && role !== "assistant" && role !== "inspector") {
    throw invalidPersisted("Invalid assignment role.");
  }
  return {
    id: requiredString(data, "id"),
    technicianId: createUserId(requiredString(data, "technicianId")),
    technicianName: requiredString(data, "technicianName"),
    role,
    status,
    assignedAt: requiredDate(data.assignedAt, "assignedAt"),
    assignedBy: createUserId(requiredString(data, "assignedBy")),
    respondedAt: optionalDate(data.respondedAt),
    rejectionReason: optionalString(data, "rejectionReason"),
    laborMinutes:
      data.laborMinutes === undefined
        ? 0
        : requiredSafeInteger(data, "laborMinutes"),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requireEvidenceStoragePath(
  storagePath: string,
  jobId: string,
  evidenceId: string,
): void {
  const expected = new RegExp(
    `^service-jobs/${escapeRegExp(jobId)}/evidence/${escapeRegExp(evidenceId)}(?:\\.[A-Za-z0-9]{1,10})?$`,
  );
  if (!expected.test(storagePath)) {
    throw invalidPersisted(
      "Persisted evidence storage path does not match its service job and evidence identity.",
    );
  }
}

function requireSignatureStoragePath(storagePath: string, jobId: string): void {
  const expected = new RegExp(
    `^service-jobs/${escapeRegExp(jobId)}/signatures/[A-Za-z0-9_-]{1,200}\\.png$`,
  );
  if (!expected.test(storagePath)) {
    throw invalidPersisted(
      "Persisted signature storage path does not match its service job.",
    );
  }
}

function mapEvidence(
  data: DocumentData,
  expectedJobId: string,
  expectedEvidenceId: string,
): ServiceJobEvidenceRecord {
  const category = data.category;
  if (
    category !== "before" &&
    category !== "during" &&
    category !== "after" &&
    category !== "serial" &&
    category !== "document"
  ) {
    throw invalidPersisted("Invalid evidence category.");
  }
  const uploadedAt = requiredDate(data.uploadedAt, "uploadedAt");
  const id = requiredString(data, "id");
  if (id !== expectedEvidenceId) {
    throw invalidPersisted(
      "Persisted evidence identity does not match its document path.",
    );
  }
  const storagePath = requiredString(data, "storagePath");
  requireEvidenceStoragePath(storagePath, expectedJobId, id);
  return {
    id,
    category,
    storagePath,
    uploadedBy: createUserId(requiredString(data, "uploadedBy")),
    uploadedAt,
    contentType: requiredString(data, "contentType"),
    sizeBytes: requiredSafeInteger(data, "sizeBytes"),
    capturedAt:
      data.capturedAt === undefined
        ? uploadedAt
        : requiredDate(data.capturedAt, "capturedAt"),
  };
}

function mapLocation(data: DocumentData | null | undefined) {
  if (!data) return null;
  return {
    latitude: requiredNumber(data, "latitude"),
    longitude: requiredNumber(data, "longitude"),
    accuracyMeters: requiredNumber(data, "accuracyMeters"),
    capturedAt: requiredDate(data.capturedAt, "capturedAt"),
    capturedBy: createUserId(requiredString(data, "capturedBy")),
  };
}

function mapExecution(
  data: DocumentData | null | undefined,
): ServiceJobExecutionState {
  if (!data) {
    return {
      checkIn: null,
      checkOut: null,
      checklist: [],
      partsConsumed: [],
      serviceActions: [],
      completionNotes: "",
      deliveryNotes: "",
    };
  }
  return {
    checkIn: mapLocation(data.checkIn),
    checkOut: mapLocation(data.checkOut),
    checklist: Array.isArray(data.checklist)
      ? data.checklist.map((item: DocumentData) => {
          const result = item.result;
          if (
            result !== "pass" &&
            result !== "fail" &&
            result !== "not_applicable"
          ) {
            throw invalidPersisted("Invalid checklist result.");
          }
          return {
            id: requiredString(item, "id"),
            label: requiredString(item, "label"),
            result,
            notes: typeof item.notes === "string" ? item.notes : "",
          };
        })
      : [],
    partsConsumed: Array.isArray(data.partsConsumed)
      ? data.partsConsumed.map((item: DocumentData) => ({
          partId: requiredString(item, "partId"),
          quantity: requiredSafeInteger(item, "quantity"),
        }))
      : [],
    serviceActions: Array.isArray(data.serviceActions)
      ? data.serviceActions.map((item: DocumentData) => ({
          code: requiredString(item, "code"),
          description: requiredString(item, "description"),
          laborMinutes: requiredSafeInteger(item, "laborMinutes"),
        }))
      : [],
    completionNotes:
      typeof data.completionNotes === "string" ? data.completionNotes : "",
    deliveryNotes:
      typeof data.deliveryNotes === "string" ? data.deliveryNotes : "",
  };
}

function mapJob(
  data: DocumentData,
  assignments: readonly ServiceJobAssignment[],
  evidence: readonly ServiceJobEvidence[],
  expectedJobId: string = requiredString(data, "id"),
): ServiceJob {
  const fulfillmentMode = data.fulfillmentMode;
  if (
    fulfillmentMode !== "onsite" &&
    fulfillmentMode !== "carry_in" &&
    fulfillmentMode !== "carrier"
  ) {
    throw invalidPersisted("Invalid fulfillment mode.");
  }
  if (data.schemaVersion !== undefined && data.schemaVersion !== 1) {
    throw invalidPersisted("Unsupported service-job schema version.");
  }
  if (requiredString(data, "id") !== expectedJobId) {
    throw invalidPersisted(
      "Persisted service-job identity does not match its document path.",
    );
  }
  const handoffSignature = data.handoffSignature as DocumentData | null;
  const signatureStoragePath = handoffSignature
    ? requiredString(handoffSignature, "storagePath")
    : null;
  if (signatureStoragePath) {
    requireSignatureStoragePath(signatureStoragePath, expectedJobId);
  }
  return {
    id: expectedJobId,
    jobNumber: requiredString(data, "jobNumber"),
    schemaVersion: 1,
    workType: mapWorkType(data.workType),
    fulfillmentMode,
    title: requiredString(data, "title"),
    description: typeof data.description === "string" ? data.description : "",
    customer: mapCustomer(data.customer ?? {}),
    contact: mapContact(data.contact ?? {}),
    asset: mapAsset(data.asset ?? {}),
    status: mapStatus(data.status),
    scheduledStartAt: optionalDate(data.scheduledStartAt),
    assignments,
    assignedTechnicianIds:
      data.assignedTechnicianIds === undefined
        ? assignments.map((assignment) => assignment.technicianId)
        : userIdArray(data.assignedTechnicianIds),
    leadTechnicianId: data.leadTechnicianId
      ? createUserId(requiredString(data, "leadTechnicianId"))
      : null,
    evidence,
    rootCause: typeof data.rootCause === "string" ? data.rootCause : "",
    solution: typeof data.solution === "string" ? data.solution : "",
    completedAt: optionalDate(data.completedAt),
    approvedAssessmentId: optionalString(data, "approvedAssessmentId"),
    handedOffAt: optionalDate(data.handedOffAt),
    handoffSignature: handoffSignature
      ? {
          signerName: requiredString(handoffSignature, "signerName"),
          storagePath: signatureStoragePath!,
          signedAt: requiredDate(handoffSignature.signedAt, "signedAt"),
        }
      : null,
    handoffOverrideReason: optionalString(data, "handoffOverrideReason"),
    termsAcceptedAt: requiredDate(data.termsAcceptedAt, "termsAcceptedAt"),
    termsAcceptedBy: requiredString(data, "termsAcceptedBy"),
    createdAt: requiredDate(data.createdAt, "createdAt"),
    createdBy: createUserId(requiredString(data, "createdBy")),
    updatedAt: requiredDate(data.updatedAt, "updatedAt"),
    updatedBy: createUserId(requiredString(data, "updatedBy")),
    version: requiredSafeInteger(data, "version"),
  };
}

function mapRecord(
  data: DocumentData,
  assignments: readonly ServiceJobAssignment[],
  evidence: readonly ServiceJobEvidenceRecord[],
  expectedJobId?: string,
): ServiceJobRecord {
  return {
    job: mapJob(data, assignments, evidence, expectedJobId),
    warehouseId: optionalString(data, "warehouseId"),
    execution: mapExecution(data.execution),
  };
}

function mapLine(data: DocumentData): ServiceJobAssessmentLine {
  const type = data.type;
  if (type !== "service" && type !== "part") {
    throw invalidPersisted("Invalid assessment line type.");
  }
  return {
    id: requiredString(data, "id"),
    code: requiredString(data, "code"),
    type,
    description: requiredString(data, "description"),
    unit: requiredString(data, "unit"),
    quantity: requiredPositiveSafeInteger(data, "quantity"),
    unitPriceSatang: requiredNonnegativeSafeInteger(data, "unitPriceSatang"),
    discountBasisPoints: requiredBasisPoints(data, "discountBasisPoints"),
    discountReason: optionalString(data, "discountReason"),
    warehouseId: optionalString(data, "warehouseId"),
    warrantyMonths: requiredNonnegativeSafeInteger(data, "warrantyMonths"),
  };
}

function requiredBasisPoints(data: DocumentData, field: string): number {
  const value = requiredNonnegativeSafeInteger(data, field);
  if (value > 10_000) {
    throw invalidPersisted(`Invalid basis-points field: ${field}.`);
  }
  return value;
}

function mapPolicy(data: DocumentData): ServiceJobChargePolicy {
  const kind = data.kind;
  if (!SERVICE_JOB_CHARGE_POLICY_KINDS.includes(kind)) {
    throw invalidPersisted("Invalid service-job charge-policy kind.");
  }
  return {
    kind,
    vatBasisPoints: requiredBasisPoints(data, "vatBasisPoints"),
    withholdingBasisPoints: requiredBasisPoints(data, "withholdingBasisPoints"),
    depositBasisPoints: requiredBasisPoints(data, "depositBasisPoints"),
  };
}

function mapTotals(data: DocumentData): ServiceJobAssessment["totals"] {
  return {
    serviceSubtotalSatang: requiredNonnegativeSafeInteger(
      data,
      "serviceSubtotalSatang",
    ),
    partsSubtotalSatang: requiredNonnegativeSafeInteger(
      data,
      "partsSubtotalSatang",
    ),
    subtotalSatang: requiredNonnegativeSafeInteger(data, "subtotalSatang"),
    discountSatang: requiredNonnegativeSafeInteger(data, "discountSatang"),
    taxableAmountSatang: requiredNonnegativeSafeInteger(
      data,
      "taxableAmountSatang",
    ),
    vatSatang: requiredNonnegativeSafeInteger(data, "vatSatang"),
    withholdingSatang: requiredNonnegativeSafeInteger(
      data,
      "withholdingSatang",
    ),
    depositSatang: requiredNonnegativeSafeInteger(data, "depositSatang"),
    totalDueSatang: requiredNonnegativeSafeInteger(data, "totalDueSatang"),
  };
}

function mapFinancialSnapshot(data: DocumentData): {
  readonly lines: readonly ServiceJobAssessmentLine[];
  readonly policy: ServiceJobChargePolicy;
  readonly totals: ServiceJobAssessment["totals"];
} {
  if (!Array.isArray(data.lines) || data.lines.length === 0) {
    throw invalidPersisted("Financial lines are required.");
  }
  if (data.lines.length > MAX_FINANCIAL_LINES) {
    throw invalidPersisted("Financial line limit exceeded.");
  }
  const lines = data.lines.map((line: DocumentData) => mapLine(line));
  const policy = mapPolicy(data.policy ?? {});
  const totals = mapTotals(data.totals ?? {});
  let calculated: ServiceJobAssessment["totals"];
  try {
    calculated = calculateAssessmentTotals(lines, policy);
  } catch (error) {
    throw invalidPersisted(
      error instanceof Error
        ? `Invalid financial snapshot: ${error.message}`
        : "Invalid financial snapshot.",
    );
  }
  if (JSON.stringify(calculated) !== JSON.stringify(totals)) {
    throw invalidPersisted(
      "Persisted financial totals do not match lines and policy.",
    );
  }
  return { lines, policy, totals };
}

export function mapPersistedServiceJobAssessment(
  data: DocumentData,
  expectedJobId: string = requiredString(data, "jobId"),
  expectedAssessmentId: string = requiredString(data, "id"),
): ServiceJobAssessment {
  requirePathIdentity(data, expectedJobId, expectedAssessmentId);
  const status = data.status;
  if (status !== "draft" && status !== "approved" && status !== "superseded") {
    throw invalidPersisted("Invalid assessment status.");
  }
  const financial = mapFinancialSnapshot(data);
  const approvedAt = optionalDate(data.approvedAt);
  const approvedBy = data.approvedBy
    ? createUserId(requiredString(data, "approvedBy"))
    : null;
  if (status === "approved" && (!approvedAt || !approvedBy)) {
    throw invalidPersisted(
      "An approved assessment requires approval timestamp and approver.",
    );
  }
  if (status === "draft" && (approvedAt || approvedBy)) {
    throw invalidPersisted("A draft assessment cannot contain approval data.");
  }
  if (status === "superseded" && Boolean(approvedAt) !== Boolean(approvedBy)) {
    throw invalidPersisted(
      "A superseded assessment must contain complete or absent approval data.",
    );
  }
  return {
    id: expectedAssessmentId,
    jobId: expectedJobId,
    revision: requiredPositiveSafeInteger(data, "revision"),
    evaluatorId: createUserId(requiredString(data, "evaluatorId")),
    status,
    lines: financial.lines,
    policy: financial.policy,
    totals: financial.totals,
    approvedAt,
    approvedBy,
    createdAt: requiredDate(data.createdAt, "createdAt"),
    createdBy: createUserId(requiredString(data, "createdBy")),
  };
}

export function mapPersistedBillingDocument(
  data: DocumentData,
  expectedJobId: string = requiredString(data, "jobId"),
  expectedDocumentId: string = requiredString(data, "id"),
): BillingDocumentRecord {
  requirePathIdentity(data, expectedJobId, expectedDocumentId);
  const kind = data.kind;
  const status = data.status;
  if (
    kind !== "delivery_note" &&
    kind !== "invoice" &&
    kind !== "tax_invoice" &&
    kind !== "service_invoice" &&
    kind !== "parts_invoice"
  ) {
    throw invalidPersisted("Invalid billing-document kind.");
  }
  if (status !== "draft" && status !== "issued" && status !== "void") {
    throw invalidPersisted("Invalid billing-document status.");
  }
  const financial = mapFinancialSnapshot(data);
  const voidedAt = optionalDate(data.voidedAt);
  const voidReason = optionalString(data, "voidReason");
  if (status === "void" && (!voidedAt || !voidReason?.trim())) {
    throw invalidPersisted(
      "A void billing document requires a void timestamp and reason.",
    );
  }
  if (status !== "void" && (voidedAt || voidReason !== null)) {
    throw invalidPersisted(
      "A non-void billing document cannot contain void metadata.",
    );
  }
  return {
    id: expectedDocumentId,
    jobId: expectedJobId,
    assessmentId: requiredString(data, "assessmentId"),
    documentNumber: requiredString(data, "documentNumber"),
    kind,
    status,
    customer: mapCustomer(data.customer ?? {}),
    contact: mapContact(data.contact ?? {}),
    asset: mapAsset(data.asset ?? {}),
    lines: financial.lines,
    policy: financial.policy,
    totals: financial.totals,
    issuedAt: requiredDate(data.issuedAt, "issuedAt"),
    issuedBy: createUserId(requiredString(data, "issuedBy")),
    voidedAt,
    voidReason,
    issueDate: requiredDate(data.issueDate, "issueDate"),
    dueDate: requiredDate(data.dueDate, "dueDate"),
    paymentTerms: requiredString(data, "paymentTerms"),
    department: requiredString(data, "department"),
    salesperson: requiredString(data, "salesperson"),
    emergencyOverrideReason: optionalString(data, "emergencyOverrideReason"),
  };
}

function mapPart(data: DocumentData): InventoryPart {
  return {
    id: requiredString(data, "id"),
    partNumber: requiredString(data, "partNumber"),
    name: requiredString(data, "name"),
    description: typeof data.description === "string" ? data.description : "",
    unit: requiredString(data, "unit"),
    quantityOnHand: requiredSafeInteger(data, "quantityOnHand"),
    reorderPoint: requiredSafeInteger(data, "reorderPoint"),
    unitCost: requiredNumber(data, "unitCost"),
    active: requiredBoolean(data, "active"),
    createdAt: requiredDate(data.createdAt, "createdAt"),
    createdBy: createUserId(requiredString(data, "createdBy")),
    updatedAt: requiredDate(data.updatedAt, "updatedAt"),
    updatedBy: createUserId(requiredString(data, "updatedBy")),
    version: requiredSafeInteger(data, "version"),
  };
}

function mapMovement(data: DocumentData): InventoryMovement {
  const type = data.type;
  if (type !== "receive" && type !== "issue" && type !== "adjustment") {
    throw invalidPersisted("Invalid inventory movement type.");
  }
  const referenceType = data.referenceType;
  if (
    referenceType !== "manual" &&
    referenceType !== "repair" &&
    referenceType !== "service_job"
  ) {
    throw invalidPersisted("Invalid inventory reference type.");
  }
  return {
    id: requiredString(data, "id"),
    movementNumber: requiredString(data, "movementNumber"),
    type,
    partId: requiredString(data, "partId"),
    partNumber: requiredString(data, "partNumber"),
    partName: requiredString(data, "partName"),
    quantity: requiredNumber(data, "quantity"),
    quantityBefore: requiredNumber(data, "quantityBefore"),
    quantityAfter: requiredNumber(data, "quantityAfter"),
    unitCost: requiredNumber(data, "unitCost"),
    referenceType,
    referenceId: optionalString(data, "referenceId"),
    notes: typeof data.notes === "string" ? data.notes : "",
    occurredAt: requiredDate(data.occurredAt, "occurredAt"),
    actorId: createUserId(requiredString(data, "actorId")),
  };
}

function serializeDate(value: Date | null): Timestamp | null {
  return value ? Timestamp.fromDate(value) : null;
}

function serializeAsset(asset: ServiceJobAssetSnapshot): DocumentData {
  return {
    ...asset,
    warrantyExpiresAt: serializeDate(asset.warrantyExpiresAt),
  };
}

function serializeAssignment(assignment: ServiceJobAssignment): DocumentData {
  return {
    ...assignment,
    assignedAt: Timestamp.fromDate(assignment.assignedAt),
    respondedAt: serializeDate(assignment.respondedAt),
  };
}

function serializeEvidence(evidence: ServiceJobEvidenceRecord): DocumentData {
  return {
    ...evidence,
    uploadedAt: Timestamp.fromDate(evidence.uploadedAt),
    capturedAt: Timestamp.fromDate(evidence.capturedAt),
  };
}

function serializeExecution(execution: ServiceJobExecutionState): DocumentData {
  const location = (value: ServiceJobExecutionState["checkIn"]) =>
    value
      ? { ...value, capturedAt: Timestamp.fromDate(value.capturedAt) }
      : null;
  return {
    ...execution,
    checkIn: location(execution.checkIn),
    checkOut: location(execution.checkOut),
  };
}

export function serializeServiceJobRecord(
  record: ServiceJobRecord,
): DocumentData {
  const job: DocumentData = { ...record.job };
  delete job.assignments;
  delete job.evidence;
  return {
    ...job,
    warehouseId: record.warehouseId,
    customer: { ...job.customer },
    contact: { ...job.contact },
    asset: serializeAsset(job.asset),
    scheduledStartAt: serializeDate(job.scheduledStartAt),
    completedAt: serializeDate(job.completedAt),
    handedOffAt: serializeDate(job.handedOffAt),
    handoffSignature: job.handoffSignature
      ? {
          ...job.handoffSignature,
          signedAt: Timestamp.fromDate(job.handoffSignature.signedAt),
        }
      : null,
    termsAcceptedAt: Timestamp.fromDate(job.termsAcceptedAt),
    createdAt: Timestamp.fromDate(job.createdAt),
    updatedAt: Timestamp.fromDate(job.updatedAt),
    execution: serializeExecution(record.execution),
  };
}

function serializeAssessment(assessment: ServiceJobAssessment): DocumentData {
  return {
    ...assessment,
    lines: assessment.lines.map((line) => ({ ...line })),
    policy: { ...assessment.policy },
    totals: { ...assessment.totals },
    approvedAt: serializeDate(assessment.approvedAt),
    createdAt: Timestamp.fromDate(assessment.createdAt),
  };
}

function serializeAssessmentResponse(
  response: ServiceJobAssessmentResponse,
): DocumentData {
  return {
    ...response,
    respondedAt: Timestamp.fromDate(response.respondedAt),
  };
}

function serializeBilling(document: BillingDocumentRecord): DocumentData {
  return {
    ...document,
    customer: { ...document.customer },
    contact: { ...document.contact },
    asset: serializeAsset(document.asset),
    lines: document.lines.map((line) => ({ ...line })),
    policy: { ...document.policy },
    totals: { ...document.totals },
    issuedAt: Timestamp.fromDate(document.issuedAt),
    voidedAt: serializeDate(document.voidedAt),
    issueDate: Timestamp.fromDate(document.issueDate),
    dueDate: Timestamp.fromDate(document.dueDate),
  };
}

function serializePart(part: InventoryPart): DocumentData {
  return {
    ...part,
    createdAt: Timestamp.fromDate(part.createdAt),
    updatedAt: Timestamp.fromDate(part.updatedAt),
  };
}

function immutableBillingSnapshot(document: BillingDocumentRecord): string {
  return JSON.stringify({
    id: document.id,
    jobId: document.jobId,
    assessmentId: document.assessmentId,
    documentNumber: document.documentNumber,
    kind: document.kind,
    customer: document.customer,
    contact: document.contact,
    asset: {
      ...document.asset,
      warrantyExpiresAt:
        document.asset.warrantyExpiresAt?.toISOString() ?? null,
    },
    lines: document.lines,
    policy: document.policy,
    totals: document.totals,
    issuedAt: document.issuedAt.toISOString(),
    issuedBy: document.issuedBy,
    issueDate: document.issueDate.toISOString(),
    dueDate: document.dueDate.toISOString(),
    paymentTerms: document.paymentTerms,
    department: document.department,
    salesperson: document.salesperson,
    emergencyOverrideReason: document.emergencyOverrideReason,
  });
}

function serializeAudit(audit: AuditLog): DocumentData {
  return { ...audit, occurredAt: Timestamp.fromDate(audit.occurredAt) };
}

function serializeEvent(event: ServiceJobEvent): DocumentData {
  validateServiceJobEventMetadata(event.metadata);
  return { ...event, occurredAt: Timestamp.fromDate(event.occurredAt) };
}

function mapOperation(value: unknown): ServiceJobEvent["operation"] {
  if (
    typeof value === "string" &&
    SERVICE_JOB_OPERATIONS.some((operation) => operation === value)
  ) {
    return value as ServiceJobEvent["operation"];
  }
  throw invalidPersisted("Invalid service-job operation.");
}

export function mapPersistedServiceJobIdempotency(
  data: DocumentData,
): ServiceJobIdempotencyRecord {
  const result = data.result;
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw invalidPersisted("Invalid idempotency result.");
  }
  for (const value of Object.values(result)) {
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw invalidPersisted("Invalid idempotency result value.");
    }
  }
  return {
    keyHash: requiredString(data, "keyHash"),
    operation: mapOperation(data.operation),
    jobId: requiredString(data, "jobId"),
    payloadHash: requiredString(data, "payloadHash"),
    result: result as ServiceJobIdempotencyRecord["result"],
    createdAt: requiredDate(data.createdAt, "createdAt"),
  };
}

export function mapPersistedServiceJobEvent(
  data: DocumentData,
  expectedJobId: string = requiredString(data, "jobId"),
  expectedEventId: string = requiredString(data, "id"),
): ServiceJobEvent {
  requirePathIdentity(data, expectedJobId, expectedEventId);
  const metadata = data.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw invalidPersisted("Invalid event metadata.");
  }
  if (!isUserRole(data.actorRole)) {
    throw invalidPersisted("Invalid event actor role.");
  }
  const event: ServiceJobEvent = {
    id: expectedEventId,
    jobId: expectedJobId,
    operation: mapOperation(data.operation),
    actorId: createUserId(requiredString(data, "actorId")),
    actorRole: data.actorRole,
    occurredAt: requiredDate(data.occurredAt, "occurredAt"),
    correlationId: requiredString(data, "correlationId"),
    metadata: metadata as ServiceJobEvent["metadata"],
  };
  validateServiceJobEventMetadata(event.metadata);
  return event;
}

export function mapPersistedServiceJobListItem(
  data: DocumentData,
  expectedJobId: string = requiredString(data, "id"),
): ServiceJobListItem {
  if (requiredString(data, "id") !== expectedJobId) {
    throw invalidPersisted(
      "Persisted service-job list identity does not match its document path.",
    );
  }
  return {
    id: expectedJobId,
    jobNumber: requiredString(data, "jobNumber"),
    workType: mapWorkType(data.workType),
    status: mapStatus(data.status),
    title: requiredString(data, "title"),
    customerId: optionalString(data.customer ?? {}, "customerId"),
    customerName: requiredString(data.customer ?? {}, "name"),
    warehouseId: optionalString(data, "warehouseId"),
    assignedTechnicianIds: userIdArray(data.assignedTechnicianIds),
    leadTechnicianId: data.leadTechnicianId
      ? createUserId(requiredString(data, "leadTechnicianId"))
      : null,
    approvedAssessmentId: optionalString(data, "approvedAssessmentId"),
    latestBillingDocumentId: optionalString(data, "latestBillingDocumentId"),
    updatedAt: requiredDate(data.updatedAt, "updatedAt"),
    version: requiredSafeInteger(data, "version"),
  };
}

class BufferedFirestoreServiceJobTransaction implements ServiceJobTransaction {
  private readonly writes: Array<() => void> = [];
  private readonly jobCache = new Map<string, ServiceJobRecord | null>();
  private readonly assignmentRefs = new Map<
    string,
    readonly DocumentReference[]
  >();
  private readonly evidenceRefs = new Map<
    string,
    readonly DocumentReference[]
  >();
  private readonly assessmentSnapshots = new Map<string, DocumentSnapshot>();
  private readonly billingSnapshots = new Map<string, DocumentSnapshot>();
  private readonly partSnapshots = new Map<string, DocumentSnapshot>();
  private readonly latestBillingDocumentIds = new Map<string, string | null>();

  constructor(
    private readonly firestore: Firestore,
    private readonly transaction: Transaction,
  ) {}

  async getJob(jobId: string): Promise<ServiceJobRecord | null> {
    if (this.jobCache.has(jobId)) return this.jobCache.get(jobId) ?? null;
    const jobRef = this.jobRef(jobId);
    const [jobSnapshot, assignmentSnapshot, evidenceSnapshot] =
      await Promise.all([
        this.transaction.get(jobRef),
        this.transaction.get(
          jobRef.collection("assignments").limit(MAX_ASSIGNMENTS + 1),
        ),
        this.transaction.get(
          jobRef.collection("evidence").limit(MAX_EVIDENCE + 1),
        ),
      ]);
    if (!jobSnapshot.exists) {
      this.jobCache.set(jobId, null);
      return null;
    }
    if (
      assignmentSnapshot.docs.length > MAX_ASSIGNMENTS ||
      evidenceSnapshot.docs.length > MAX_EVIDENCE
    ) {
      throw new ServiceJobPersistenceError(
        "SERVICE_JOB_CHILD_CONFLICT",
        "Service-job child collection exceeds the supported aggregate bound.",
      );
    }
    const assignments = assignmentSnapshot.docs.map((document) => {
      if (requiredString(document.data(), "id") !== document.id) {
        throw invalidPersisted(
          "Persisted assignment identity does not match its document path.",
        );
      }
      return mapAssignment(document.data());
    });
    const evidence = evidenceSnapshot.docs.map((document) => {
      if (requiredString(document.data(), "id") !== document.id) {
        throw invalidPersisted(
          "Persisted evidence identity does not match its document path.",
        );
      }
      return mapEvidence(document.data(), jobId, document.id);
    });
    this.assignmentRefs.set(
      jobId,
      assignmentSnapshot.docs.map((document) => document.ref),
    );
    this.evidenceRefs.set(
      jobId,
      evidenceSnapshot.docs.map((document) => document.ref),
    );
    const record = mapRecord(
      jobSnapshot.data() ?? {},
      assignments,
      evidence,
      jobId,
    );
    this.latestBillingDocumentIds.set(
      jobId,
      optionalString(jobSnapshot.data() ?? {}, "latestBillingDocumentId"),
    );
    this.jobCache.set(jobId, record);
    return record;
  }

  putJob(record: ServiceJobRecord, expectedVersion: number | null): void {
    const current = this.jobCache.get(record.job.id);
    if (expectedVersion !== null) {
      if (!current || current.job.version !== expectedVersion) {
        throw new ServiceJobPersistenceError(
          "SERVICE_JOB_VERSION_CONFLICT",
          "Service job has changed or was not loaded in this transaction.",
        );
      }
      this.writes.push(() =>
        this.transaction.set(
          this.jobRef(record.job.id),
          serializeServiceJobRecord(record),
          {
            merge: true,
          },
        ),
      );
    } else {
      this.writes.push(() =>
        this.transaction.create(
          this.jobRef(record.job.id),
          serializeServiceJobRecord(record),
        ),
      );
    }
    this.jobCache.set(record.job.id, record);
  }

  replaceAssignments(
    jobId: string,
    assignments: readonly ServiceJobAssignment[],
  ): void {
    const refs = this.assignmentRefs.get(jobId);
    if (!refs) {
      throw new ServiceJobPersistenceError(
        "SERVICE_JOB_CHILD_CONFLICT",
        "Assignments were not loaded before replacement.",
      );
    }
    this.writes.push(() => {
      const retainedIds = new Set(
        assignments.map((assignment) => assignment.id),
      );
      for (const reference of refs) {
        if (!retainedIds.has(reference.id)) this.transaction.delete(reference);
      }
      for (const assignment of assignments) {
        this.transaction.set(
          this.jobRef(jobId).collection("assignments").doc(assignment.id),
          serializeAssignment(assignment),
        );
      }
    });
  }

  putAssignment(jobId: string, assignment: ServiceJobAssignment): void {
    this.writes.push(() =>
      this.transaction.set(
        this.jobRef(jobId).collection("assignments").doc(assignment.id),
        serializeAssignment(assignment),
      ),
    );
  }

  putExecution(jobId: string, execution: ServiceJobExecutionState): void {
    this.writes.push(() =>
      this.transaction.update(this.jobRef(jobId), {
        execution: serializeExecution(execution),
      }),
    );
  }

  putEvidence(
    jobId: string,
    evidence: readonly ServiceJobEvidenceRecord[],
  ): void {
    const refs = this.evidenceRefs.get(jobId);
    if (!refs) {
      throw new ServiceJobPersistenceError(
        "SERVICE_JOB_CHILD_CONFLICT",
        "Evidence was not loaded before replacement.",
      );
    }
    this.writes.push(() => {
      const retainedIds = new Set(evidence.map((item) => item.id));
      for (const reference of refs) {
        if (!retainedIds.has(reference.id)) this.transaction.delete(reference);
      }
      for (const item of evidence) {
        this.transaction.set(
          this.jobRef(jobId).collection("evidence").doc(item.id),
          serializeEvidence(item),
        );
      }
    });
  }

  async getAssessment(
    jobId: string,
    assessmentId: string,
  ): Promise<ServiceJobAssessment | null> {
    const key = `${jobId}/${assessmentId}`;
    const cached = this.assessmentSnapshots.get(key);
    if (cached)
      return cached.exists
        ? mapPersistedServiceJobAssessment(
            cached.data() ?? {},
            jobId,
            assessmentId,
          )
        : null;
    const snapshot = await this.transaction.get(
      this.jobRef(jobId).collection("assessments").doc(assessmentId),
    );
    this.assessmentSnapshots.set(key, snapshot);
    return snapshot.exists
      ? mapPersistedServiceJobAssessment(
          snapshot.data() ?? {},
          jobId,
          assessmentId,
        )
      : null;
  }

  async listAssessments(
    jobId: string,
    limit: number,
  ): Promise<readonly ServiceJobAssessment[]> {
    const snapshot = await this.transaction.get(
      this.jobRef(jobId)
        .collection("assessments")
        .orderBy("revision", "desc")
        .limit(Math.min(Math.max(limit, 1), 101)),
    );
    return snapshot.docs.map((document) => {
      this.assessmentSnapshots.set(`${jobId}/${document.id}`, document);
      return mapPersistedServiceJobAssessment(
        document.data(),
        jobId,
        document.id,
      );
    });
  }

  createAssessment(assessment: ServiceJobAssessment): void {
    const reference = this.jobRef(assessment.jobId)
      .collection("assessments")
      .doc(assessment.id);
    this.writes.push(() =>
      this.transaction.create(reference, serializeAssessment(assessment)),
    );
  }

  putAssessment(assessment: ServiceJobAssessment): void {
    const key = `${assessment.jobId}/${assessment.id}`;
    const snapshot = this.assessmentSnapshots.get(key);
    if (!snapshot?.exists) {
      throw new ServiceJobPersistenceError(
        "ASSESSMENT_NOT_FOUND",
        "Assessment was not loaded before update.",
      );
    }
    const current = mapPersistedServiceJobAssessment(
      snapshot.data() ?? {},
      assessment.jobId,
      assessment.id,
    );
    if (
      current.status !== "draft" ||
      (assessment.status !== "approved" && assessment.status !== "superseded")
    ) {
      throw new ServiceJobPersistenceError(
        "SERVICE_JOB_CHILD_CONFLICT",
        "Approved or superseded assessment financial snapshots are immutable.",
      );
    }
    this.writes.push(() =>
      this.transaction.update(snapshot.ref, {
        status: assessment.status,
        approvedAt: serializeDate(assessment.approvedAt),
        approvedBy: assessment.approvedBy,
      }),
    );
  }

  putAssessmentResponse(
    jobId: string,
    assessmentId: string,
    response: ServiceJobAssessmentResponse,
  ): void {
    const snapshot = this.assessmentSnapshots.get(`${jobId}/${assessmentId}`);
    if (!snapshot?.exists) {
      throw new ServiceJobPersistenceError(
        "ASSESSMENT_NOT_FOUND",
        "Assessment was not loaded before response.",
      );
    }
    if (snapshot.get("customerResponse")) {
      throw new ServiceJobPersistenceError(
        "SERVICE_JOB_CHILD_CONFLICT",
        "Assessment response is immutable.",
      );
    }
    this.writes.push(() =>
      this.transaction.update(snapshot.ref, {
        customerResponse: serializeAssessmentResponse(response),
      }),
    );
  }

  async getBillingDocument(
    jobId: string,
    documentId: string,
  ): Promise<BillingDocumentRecord | null> {
    const key = `${jobId}/${documentId}`;
    const cached = this.billingSnapshots.get(key);
    if (cached)
      return cached.exists
        ? mapPersistedBillingDocument(cached.data() ?? {}, jobId, documentId)
        : null;
    const snapshot = await this.transaction.get(
      this.jobRef(jobId).collection("billing_documents").doc(documentId),
    );
    this.billingSnapshots.set(key, snapshot);
    return snapshot.exists
      ? mapPersistedBillingDocument(snapshot.data() ?? {}, jobId, documentId)
      : null;
  }

  async listBillingDocuments(
    jobId: string,
    limit: number,
  ): Promise<readonly BillingDocumentRecord[]> {
    const snapshot = await this.transaction.get(
      this.jobRef(jobId)
        .collection("billing_documents")
        .orderBy("issuedAt", "desc")
        .limit(Math.min(Math.max(limit, 1), 51)),
    );
    return snapshot.docs.map((document) => {
      this.billingSnapshots.set(`${jobId}/${document.id}`, document);
      return mapPersistedBillingDocument(document.data(), jobId, document.id);
    });
  }

  createBillingDocument(document: BillingDocumentRecord): void {
    const reference = this.jobRef(document.jobId)
      .collection("billing_documents")
      .doc(document.id);
    this.writes.push(() => {
      this.transaction.create(reference, serializeBilling(document));
      this.transaction.update(this.jobRef(document.jobId), {
        latestBillingDocumentId: document.id,
        latestBillingDocumentNumber: document.documentNumber,
        latestBillingDocumentStatus: document.status,
      });
      this.latestBillingDocumentIds.set(document.jobId, document.id);
    });
  }

  voidBillingDocument(document: BillingDocumentRecord): void {
    const snapshot = this.billingSnapshots.get(
      `${document.jobId}/${document.id}`,
    );
    if (!snapshot?.exists) {
      throw new ServiceJobPersistenceError(
        "BILLING_DOCUMENT_NOT_FOUND",
        "Billing document was not loaded before voiding.",
      );
    }
    const current = mapPersistedBillingDocument(
      snapshot.data() ?? {},
      document.jobId,
      document.id,
    );
    if (
      current.status !== "issued" ||
      document.status !== "void" ||
      immutableBillingSnapshot(current) !== immutableBillingSnapshot(document)
    ) {
      throw new ServiceJobPersistenceError(
        "BILLING_DOCUMENT_IMMUTABLE",
        "Issued billing financial and customer snapshots are immutable.",
      );
    }
    this.writes.push(() => {
      this.transaction.update(snapshot.ref, {
        status: "void",
        voidedAt: serializeDate(document.voidedAt),
        voidReason: document.voidReason,
      });
      if (this.latestBillingDocumentIds.get(document.jobId) === document.id) {
        this.transaction.update(this.jobRef(document.jobId), {
          latestBillingDocumentStatus: "void",
        });
      }
    });
  }

  async getInventoryPart(partId: string): Promise<InventoryPart | null> {
    const cached = this.partSnapshots.get(partId);
    if (cached) return cached.exists ? mapPart(cached.data() ?? {}) : null;
    const snapshot = await this.transaction.get(
      this.firestore.collection("inventory_parts").doc(partId),
    );
    this.partSnapshots.set(partId, snapshot);
    return snapshot.exists ? mapPart(snapshot.data() ?? {}) : null;
  }

  issueInventory(
    part: InventoryPart,
    movement: InventoryMovement,
    expectedVersion: number,
  ): void {
    const snapshot = this.partSnapshots.get(part.id);
    if (!snapshot?.exists) {
      throw new ServiceJobPersistenceError(
        "INVENTORY_PART_NOT_FOUND",
        "Inventory part was not loaded before issue.",
      );
    }
    if (snapshot.get("version") !== expectedVersion) {
      throw new ServiceJobPersistenceError(
        "INVENTORY_VERSION_CONFLICT",
        "Inventory part has changed.",
      );
    }
    this.writes.push(() => {
      this.transaction.set(snapshot.ref, serializePart(part));
      this.transaction.create(
        this.firestore.collection("inventory_movements").doc(movement.id),
        { ...movement, occurredAt: Timestamp.fromDate(movement.occurredAt) },
      );
    });
  }

  async getInventoryMovement(
    movementId: string,
  ): Promise<InventoryMovement | null> {
    const snapshot = await this.transaction.get(
      this.firestore.collection("inventory_movements").doc(movementId),
    );
    return snapshot.exists ? mapMovement(snapshot.data() ?? {}) : null;
  }

  async getIdempotency(
    keyHash: string,
  ): Promise<ServiceJobIdempotencyRecord | null> {
    const snapshot = await this.transaction.get(
      this.firestore.collection("service_job_idempotency").doc(keyHash),
    );
    if (!snapshot.exists) return null;
    const record = mapPersistedServiceJobIdempotency(snapshot.data() ?? {});
    if (record.keyHash !== keyHash) {
      throw invalidPersisted(
        "Persisted idempotency key does not match its document path.",
      );
    }
    return record;
  }

  createIdempotency(record: ServiceJobIdempotencyRecord): void {
    this.writes.push(() =>
      this.transaction.create(
        this.firestore
          .collection("service_job_idempotency")
          .doc(record.keyHash),
        { ...record, createdAt: Timestamp.fromDate(record.createdAt) },
      ),
    );
  }

  async nextDocumentNumber(
    scope: ServiceJobDocumentNumberScope,
  ): Promise<string> {
    const resolvedScope = resolveServiceJobDocumentNumberScope(scope);
    const reference = this.firestore
      .collection("service_job_document_counters")
      .doc(resolvedScope.counterId);
    const snapshot = await this.transaction.get(reference);
    const current = snapshot.exists ? snapshot.get("lastNumber") : 0;
    if (!Number.isSafeInteger(current) || current < 0) {
      throw invalidPersisted("Invalid billing-document counter.");
    }
    const next = current + 1;
    if (!Number.isSafeInteger(next)) {
      throw invalidPersisted("Billing-document counter overflow.");
    }
    this.writes.push(() =>
      this.transaction.set(
        reference,
        {
          fiscalYear: scope.fiscalYear,
          warehouseId: scope.warehouseId,
          kind: scope.kind,
          lastNumber: next,
          updatedAt: Timestamp.now(),
        },
        { merge: false },
      ),
    );
    return formatServiceJobDocumentNumber(scope, next);
  }

  reserveDocumentNumber(documentNumber: string): void {
    const reservationId = serviceJobDocumentNumberReservationId(documentNumber);
    const reference = this.firestore
      .collection("service_job_document_number_reservations")
      .doc(reservationId);
    this.writes.push(() =>
      this.transaction.create(reference, {
        reservationId,
        documentNumber,
        createdAt: Timestamp.now(),
      }),
    );
  }

  appendEvent(event: ServiceJobEvent): void {
    const reference = this.jobRef(event.jobId)
      .collection("events")
      .doc(event.id);
    this.writes.push(() =>
      this.transaction.create(reference, serializeEvent(event)),
    );
  }

  appendAudit(audit: AuditLog): void {
    this.writes.push(() =>
      this.transaction.create(
        this.firestore.collection("audit_logs").doc(audit.id),
        serializeAudit(audit),
      ),
    );
  }

  flush(): void {
    for (const write of this.writes) write();
  }

  private jobRef(jobId: string) {
    return this.firestore.collection("service_jobs").doc(jobId);
  }
}

export class FirestoreServiceJobRepository implements ServiceJobRepository {
  constructor(
    private readonly firestore: Firestore = getFirebaseAdminFirestore(),
  ) {}

  createId(kind: string): string {
    const collection =
      kind === "inventory_movement"
        ? "inventory_movements"
        : kind === "audit"
          ? "audit_logs"
          : kind === "service_job"
            ? "service_jobs"
            : `service_job_${kind}s`;
    return this.firestore.collection(collection).doc().id;
  }

  async findById(id: string): Promise<ServiceJobRecord | null> {
    const reference = this.firestore.collection("service_jobs").doc(id);
    const [jobSnapshot, assignmentSnapshot, evidenceSnapshot] =
      await Promise.all([
        reference.get(),
        reference
          .collection("assignments")
          .orderBy("assignedAt", "asc")
          .limit(MAX_ASSIGNMENTS + 1)
          .get(),
        reference
          .collection("evidence")
          .orderBy("uploadedAt", "asc")
          .limit(MAX_EVIDENCE + 1)
          .get(),
      ]);
    if (!jobSnapshot.exists) return null;
    if (
      assignmentSnapshot.docs.length > MAX_ASSIGNMENTS ||
      evidenceSnapshot.docs.length > MAX_EVIDENCE
    ) {
      throw new ServiceJobPersistenceError(
        "SERVICE_JOB_CHILD_CONFLICT",
        "Service-job child collection exceeds the supported aggregate bound.",
      );
    }
    return mapRecord(
      jobSnapshot.data() ?? {},
      assignmentSnapshot.docs.map((document) => {
        if (requiredString(document.data(), "id") !== document.id) {
          throw invalidPersisted(
            "Persisted assignment identity does not match its document path.",
          );
        }
        return mapAssignment(document.data());
      }),
      evidenceSnapshot.docs.map((document) => {
        if (requiredString(document.data(), "id") !== document.id) {
          throw invalidPersisted(
            "Persisted evidence identity does not match its document path.",
          );
        }
        return mapEvidence(document.data(), id, document.id);
      }),
      id,
    );
  }

  async list(
    criteria: ServiceJobListCriteria,
  ): Promise<readonly ServiceJobListItem[]> {
    let query: Query = this.firestore.collection("service_jobs");
    if (criteria.status) query = query.where("status", "==", criteria.status);
    if (criteria.workType) {
      query = query.where("workType", "==", criteria.workType);
    }
    if (criteria.warehouseId) {
      query = query.where("warehouseId", "==", criteria.warehouseId);
    }
    if (criteria.customerId) {
      query = query.where("customer.customerId", "==", criteria.customerId);
    }
    if (criteria.assignedTechnicianId) {
      query = query.where(
        "assignedTechnicianIds",
        "array-contains",
        criteria.assignedTechnicianId,
      );
    }
    const snapshot = await query
      .orderBy("updatedAt", "desc")
      .limit(Math.min(Math.max(criteria.limit, 1), 200))
      .get();
    return snapshot.docs.map((document) =>
      mapPersistedServiceJobListItem(document.data(), document.id),
    );
  }

  async listAssessments(
    jobId: string,
    limit: number,
  ): Promise<readonly ServiceJobAssessmentRecord[]> {
    const snapshot = await this.firestore
      .collection("service_jobs")
      .doc(jobId)
      .collection("assessments")
      .orderBy("revision", "desc")
      .limit(Math.min(Math.max(limit, 1), 50))
      .get();
    return snapshot.docs.map((document) => {
      const data = document.data();
      const response = data.customerResponse as DocumentData | undefined;
      return {
        assessment: mapPersistedServiceJobAssessment(data, jobId, document.id),
        customerResponse: response
          ? {
              response: parseServiceJobAssessmentResponse(response.response),
              responderName: requiredString(response, "responderName"),
              responseReason: optionalString(response, "responseReason"),
              respondedAt: requiredDate(response.respondedAt, "respondedAt"),
              responderId: createUserId(
                requiredString(response, "responderId"),
              ),
            }
          : null,
      };
    });
  }

  async listBillingDocuments(
    jobId: string,
    limit: number,
  ): Promise<readonly BillingDocumentRecord[]> {
    const snapshot = await this.firestore
      .collection("service_jobs")
      .doc(jobId)
      .collection("billing_documents")
      .orderBy("issuedAt", "desc")
      .limit(Math.min(Math.max(limit, 1), 50))
      .get();
    return snapshot.docs.map((document) =>
      mapPersistedBillingDocument(document.data(), jobId, document.id),
    );
  }

  async listEvents(
    jobId: string,
    limit: number,
  ): Promise<readonly ServiceJobEvent[]> {
    const snapshot = await this.firestore
      .collection("service_jobs")
      .doc(jobId)
      .collection("events")
      .orderBy("occurredAt", "desc")
      .limit(Math.min(Math.max(limit, 1), 100))
      .get();
    return snapshot.docs.map((document) =>
      mapPersistedServiceJobEvent(document.data(), jobId, document.id),
    );
  }

  async runInTransaction<T>(
    work: (transaction: ServiceJobTransaction) => Promise<T>,
  ): Promise<T> {
    return this.firestore.runTransaction(async (firestoreTransaction) => {
      const transaction = new BufferedFirestoreServiceJobTransaction(
        this.firestore,
        firestoreTransaction,
      );
      const result = await work(transaction);
      transaction.flush();
      return result;
    });
  }
}
