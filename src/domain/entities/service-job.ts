import type { UserId } from "@/domain/value-objects/user-id";

export const SERVICE_JOB_WORK_TYPES = [
  "repair",
  "installation",
  "new_machine_test",
] as const;
export type ServiceJobWorkType = (typeof SERVICE_JOB_WORK_TYPES)[number];

export const SERVICE_JOB_FULFILLMENT_MODES = [
  "onsite",
  "carry_in",
  "carrier",
] as const;
export type ServiceJobFulfillmentMode =
  (typeof SERVICE_JOB_FULFILLMENT_MODES)[number];

export const SERVICE_JOB_STATUSES = [
  "draft",
  "received",
  "scheduled",
  "assigned",
  "in_progress",
  "waiting_parts",
  "waiting_customer",
  "assessment_pending",
  "approved",
  "completed",
  "invoiced",
  "handed_off",
  "closed",
  "cancelled",
] as const;
export type ServiceJobStatus = (typeof SERVICE_JOB_STATUSES)[number];

export type ServiceJobAssignmentRole = "lead" | "assistant" | "inspector";
export type ServiceJobAssignmentStatus = "pending" | "accepted" | "rejected";
export type ServiceJobEvidenceCategory =
  | "before"
  | "during"
  | "after"
  | "serial"
  | "document";
export type ServiceJobAssessmentStatus = "draft" | "approved" | "superseded";
export type ServiceJobAssessmentLineType = "service" | "part";
export const SERVICE_JOB_CHARGE_POLICY_KINDS = [
  "out_of_warranty",
  "no_charge_in_warranty",
  "charge_in_warranty",
  "manual",
] as const;
export type ServiceJobChargePolicyKind =
  (typeof SERVICE_JOB_CHARGE_POLICY_KINDS)[number];
export type BillingDocumentKind =
  | "delivery_note"
  | "invoice"
  | "tax_invoice"
  | "service_invoice"
  | "parts_invoice";
export type BillingDocumentStatus = "draft" | "issued" | "void";

export interface ServiceJobCustomerSnapshot {
  readonly customerId: string | null;
  readonly name: string;
  readonly taxId: string | null;
  readonly group: string | null;
  readonly billingAddress: string;
  readonly serviceAddress: string;
  readonly primaryPhone: string;
  readonly secondaryPhone: string | null;
}

export interface ServiceJobContactSnapshot {
  readonly name: string;
  readonly phone: string;
  readonly extension: string | null;
  readonly email: string | null;
}

export interface ServiceJobAssetSnapshot {
  readonly assetId: string | null;
  readonly assetCode: string | null;
  readonly serialNumber: string | null;
  readonly equipmentType: string;
  readonly brand: string;
  readonly model: string;
  readonly warrantyStatus: "active" | "expired" | "unknown";
  readonly warrantyExpiresAt: Date | null;
  readonly repeatRepair: boolean;
  readonly previousRepairNumber: string | null;
  readonly includedAccessories: readonly string[];
  readonly observedDefects: readonly string[];
  readonly additionalRequirements: string;
}

export interface ServiceJobEvidence {
  readonly id: string;
  readonly category: ServiceJobEvidenceCategory;
  readonly storagePath: string;
  readonly uploadedBy: UserId;
  readonly uploadedAt: Date;
}

export interface ServiceJobCustomerSignature {
  readonly signerName: string;
  readonly storagePath: string;
  readonly signedAt: Date;
}

export interface ServiceJobAssignment {
  readonly id: string;
  readonly technicianId: UserId;
  readonly technicianName: string;
  readonly role: ServiceJobAssignmentRole;
  readonly status: ServiceJobAssignmentStatus;
  readonly assignedAt: Date;
  readonly assignedBy: UserId;
  readonly respondedAt: Date | null;
  readonly rejectionReason: string | null;
  readonly laborMinutes: number;
}

export interface ServiceJobAssessmentLine {
  readonly id: string;
  readonly code: string;
  readonly type: ServiceJobAssessmentLineType;
  readonly description: string;
  readonly unit: string;
  readonly quantity: number;
  readonly unitPriceSatang: number;
  readonly discountBasisPoints: number;
  readonly discountReason: string | null;
  readonly warehouseId: string | null;
  readonly warrantyMonths: number;
}

export interface ServiceJobChargePolicy {
  readonly kind: ServiceJobChargePolicyKind;
  readonly vatBasisPoints: number;
  readonly withholdingBasisPoints: number;
  readonly depositBasisPoints: number;
}

export interface ServiceJobAssessmentTotals {
  readonly serviceSubtotalSatang: number;
  readonly partsSubtotalSatang: number;
  readonly subtotalSatang: number;
  readonly discountSatang: number;
  readonly taxableAmountSatang: number;
  readonly vatSatang: number;
  readonly withholdingSatang: number;
  readonly depositSatang: number;
  readonly totalDueSatang: number;
}

export interface ServiceJobAssessment {
  readonly id: string;
  readonly jobId: string;
  readonly revision: number;
  readonly evaluatorId: UserId;
  readonly status: ServiceJobAssessmentStatus;
  readonly lines: readonly ServiceJobAssessmentLine[];
  readonly policy: ServiceJobChargePolicy;
  readonly totals: ServiceJobAssessmentTotals;
  readonly approvedAt: Date | null;
  readonly approvedBy: UserId | null;
  readonly createdAt: Date;
  readonly createdBy: UserId;
}

export interface BillingDocument {
  readonly id: string;
  readonly jobId: string;
  readonly assessmentId: string;
  readonly documentNumber: string;
  readonly kind: BillingDocumentKind;
  readonly status: BillingDocumentStatus;
  readonly customer: ServiceJobCustomerSnapshot;
  readonly contact: ServiceJobContactSnapshot;
  readonly asset: ServiceJobAssetSnapshot;
  readonly lines: readonly ServiceJobAssessmentLine[];
  readonly policy: ServiceJobChargePolicy;
  readonly totals: ServiceJobAssessmentTotals;
  readonly issuedAt: Date;
  readonly issuedBy: UserId;
  readonly voidedAt: Date | null;
  readonly voidReason: string | null;
}

export interface ServiceJob {
  readonly id: string;
  readonly jobNumber: string;
  readonly schemaVersion: 1;
  readonly workType: ServiceJobWorkType;
  readonly fulfillmentMode: ServiceJobFulfillmentMode;
  readonly title: string;
  readonly description: string;
  readonly customer: ServiceJobCustomerSnapshot;
  readonly contact: ServiceJobContactSnapshot;
  readonly asset: ServiceJobAssetSnapshot;
  readonly status: ServiceJobStatus;
  readonly scheduledStartAt: Date | null;
  readonly assignments: readonly ServiceJobAssignment[];
  readonly assignedTechnicianIds: readonly UserId[];
  readonly leadTechnicianId: UserId | null;
  readonly evidence: readonly ServiceJobEvidence[];
  readonly rootCause: string;
  readonly solution: string;
  readonly completedAt: Date | null;
  readonly approvedAssessmentId: string | null;
  readonly handedOffAt: Date | null;
  readonly handoffSignature: ServiceJobCustomerSignature | null;
  readonly handoffOverrideReason: string | null;
  readonly termsAcceptedAt: Date;
  readonly termsAcceptedBy: string;
  readonly createdAt: Date;
  readonly createdBy: UserId;
  readonly updatedAt: Date;
  readonly updatedBy: UserId;
  readonly version: number;
}

export interface CreateServiceJobInput {
  readonly workType: ServiceJobWorkType;
  readonly fulfillmentMode: ServiceJobFulfillmentMode;
  readonly title: string;
  readonly description: string;
  readonly customer: ServiceJobCustomerSnapshot;
  readonly contact: ServiceJobContactSnapshot;
  readonly asset: ServiceJobAssetSnapshot;
  readonly termsAcceptedAt: Date;
  readonly termsAcceptedBy: string;
}

export interface TransitionServiceJobInput {
  readonly expectedVersion: number;
  readonly targetStatus: ServiceJobStatus;
  readonly scheduledStartAt?: Date;
}

export interface ServiceJobAssignmentInput {
  readonly technicianId: UserId;
  readonly technicianName: string;
  readonly role: ServiceJobAssignmentRole;
}

export interface AssignServiceJobInput {
  readonly expectedVersion: number;
  readonly assignments: readonly ServiceJobAssignmentInput[];
}

export interface CompleteServiceJobInput {
  readonly expectedVersion: number;
  readonly rootCause: string;
  readonly solution: string;
  readonly evidence: readonly ServiceJobEvidence[];
}

export interface CreateServiceJobAssessmentInput {
  readonly id: string;
  readonly expectedVersion: number;
  readonly revision: number;
  readonly evaluatorId: UserId;
  readonly lines: readonly ServiceJobAssessmentLine[];
  readonly policy?: ServiceJobChargePolicy;
}

export interface ApproveServiceJobAssessmentInput {
  readonly expectedVersion: number;
  readonly approverId: UserId;
}

export interface CreateBillingDocumentInput {
  readonly id: string;
  readonly expectedVersion: number;
  readonly kind: BillingDocumentKind;
  readonly documentNumber: string;
}

export interface HandoffServiceJobInput {
  readonly expectedVersion: number;
  readonly customerSignature: ServiceJobCustomerSignature | null;
  readonly overrideReason: string | null;
}
