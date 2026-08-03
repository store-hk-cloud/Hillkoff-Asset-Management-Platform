import type {
  ApproveServiceJobAssessmentInput,
  AssignServiceJobInput,
  BillingDocument,
  CompleteServiceJobInput,
  CreateBillingDocumentInput,
  CreateServiceJobAssessmentInput,
  CreateServiceJobInput,
  HandoffServiceJobInput,
  ServiceJob,
  ServiceJobAssessment,
  ServiceJobAssessmentLine,
  ServiceJobAssetSnapshot,
  ServiceJobChargePolicy,
  ServiceJobContactSnapshot,
  ServiceJobCustomerSignature,
  ServiceJobCustomerSnapshot,
  ServiceJobEvidence,
  ServiceJobStatus,
  TransitionServiceJobInput,
} from "@/domain/entities/service-job";
import { ServiceJobError } from "@/domain/errors/service-job.error";
import { calculateAssessmentTotals } from "@/domain/services/service-job-money.service";
import type { UserId } from "@/domain/value-objects/user-id";

const DEFAULT_CHARGE_POLICY: ServiceJobChargePolicy = {
  kind: "out_of_warranty",
  vatBasisPoints: 700,
  withholdingBasisPoints: 300,
  depositBasisPoints: 3000,
};

const PROTECTED_TRANSITION_TARGETS = new Set<ServiceJobStatus>([
  "assigned",
  "completed",
  "approved",
  "invoiced",
  "handed_off",
]);

const ALLOWED_TRANSITIONS: Readonly<
  Record<ServiceJobStatus, readonly ServiceJobStatus[]>
> = {
  draft: ["received", "cancelled"],
  received: ["scheduled", "cancelled"],
  scheduled: ["assigned", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: [
    "waiting_parts",
    "waiting_customer",
    "assessment_pending",
    "completed",
    "cancelled",
  ],
  waiting_parts: [
    "in_progress",
    "waiting_customer",
    "assessment_pending",
    "completed",
    "cancelled",
  ],
  waiting_customer: [
    "in_progress",
    "assessment_pending",
    "completed",
    "cancelled",
  ],
  assessment_pending: ["approved", "waiting_customer", "cancelled"],
  approved: ["completed", "invoiced", "cancelled"],
  completed: ["invoiced", "cancelled"],
  invoiced: ["handed_off", "cancelled"],
  handed_off: ["closed"],
  closed: [],
  cancelled: [],
};

export class ServiceJobDomainService {
  create(
    id: string,
    input: CreateServiceJobInput,
    actorId: UserId,
    now: Date,
  ): ServiceJob {
    return {
      id,
      jobNumber: `SVC-${now
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14)}-${id.slice(0, 6).toUpperCase()}`,
      schemaVersion: 1,
      workType: input.workType,
      fulfillmentMode: input.fulfillmentMode,
      title: input.title.trim(),
      description: input.description.trim(),
      customer: this.cloneCustomerSnapshot(input.customer),
      contact: this.cloneContactSnapshot(input.contact),
      asset: this.cloneAssetSnapshot(input.asset),
      status: "draft",
      scheduledStartAt: null,
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
      termsAcceptedAt: this.cloneDate(input.termsAcceptedAt),
      termsAcceptedBy: input.termsAcceptedBy.trim(),
      createdAt: this.cloneDate(now),
      createdBy: actorId,
      updatedAt: this.cloneDate(now),
      updatedBy: actorId,
      version: 0,
    };
  }

  transition(
    job: ServiceJob,
    input: TransitionServiceJobInput,
    actorId: UserId,
    now: Date,
  ): ServiceJob {
    this.requireVersion(job, input.expectedVersion);
    this.requireGenericTransitionTarget(input.targetStatus);
    this.requireTransition(job.status, input.targetStatus);
    if (input.targetStatus === "scheduled" && !input.scheduledStartAt) {
      throw new ServiceJobError(
        "SCHEDULED_START_REQUIRED",
        "A scheduled start time is required before scheduling a service job.",
      );
    }

    return {
      ...job,
      status: input.targetStatus,
      scheduledStartAt:
        input.targetStatus === "scheduled"
          ? this.cloneDate(input.scheduledStartAt as Date)
          : this.cloneDateOrNull(job.scheduledStartAt),
      updatedAt: this.cloneDate(now),
      updatedBy: actorId,
      version: job.version + 1,
    };
  }

  assign(
    job: ServiceJob,
    input: AssignServiceJobInput,
    actorId: UserId,
    now: Date,
  ): ServiceJob {
    this.requireVersion(job, input.expectedVersion);
    if (job.status !== "assigned")
      this.requireTransition(job.status, "assigned");
    this.requireAssignmentInputs(input);

    const accepted = job.assignments
      .filter((assignment) => assignment.status === "accepted")
      .map((assignment) => ({
        ...assignment,
        assignedAt: this.cloneDate(assignment.assignedAt),
        respondedAt: this.cloneDateOrNull(assignment.respondedAt),
      }));
    const acceptedTechnicianIds = new Set(
      accepted.map((assignment) => assignment.technicianId),
    );
    const assignments = [
      ...accepted,
      ...input.assignments
        .filter(
          (assignment) => !acceptedTechnicianIds.has(assignment.technicianId),
        )
        .map((assignment) => ({
          id: `${job.id}-${assignment.technicianId}`,
          technicianId: assignment.technicianId,
          technicianName: assignment.technicianName.trim(),
          role: assignment.role,
          status: "pending" as const,
          assignedAt: this.cloneDate(now),
          assignedBy: actorId,
          respondedAt: null,
          rejectionReason: null,
          laborMinutes: 0,
        })),
    ];
    const lead = assignments.find((assignment) => assignment.role === "lead");
    if (
      !lead ||
      assignments.filter((assignment) => assignment.role === "lead").length !==
        1
    ) {
      throw new ServiceJobError(
        "ASSIGNMENT_LEAD_REQUIRED",
        "Exactly one lead technician is required.",
      );
    }

    return {
      ...job,
      status: "assigned",
      assignments,
      assignedTechnicianIds: assignments.map(
        (assignment) => assignment.technicianId,
      ),
      leadTechnicianId: lead.technicianId,
      updatedAt: this.cloneDate(now),
      updatedBy: actorId,
      version: job.version + 1,
    };
  }

  complete(
    job: ServiceJob,
    input: CompleteServiceJobInput,
    actorId: UserId,
    now: Date,
  ): ServiceJob {
    this.requireVersion(job, input.expectedVersion);
    this.requireTransition(job.status, "completed");
    if (job.assignments.length === 0 || input.evidence.length === 0) {
      throw new ServiceJobError(
        "COMPLETION_EVIDENCE_REQUIRED",
        "Assignments and execution evidence are required before completion.",
      );
    }
    if (!input.rootCause.trim() || !input.solution.trim()) {
      throw new ServiceJobError(
        "COMPLETION_DETAILS_REQUIRED",
        "Root cause and solution are required before completion.",
      );
    }

    return {
      ...job,
      status: "completed",
      evidence: this.cloneEvidence(input.evidence),
      rootCause: input.rootCause.trim(),
      solution: input.solution.trim(),
      completedAt: this.cloneDate(now),
      updatedAt: this.cloneDate(now),
      updatedBy: actorId,
      version: job.version + 1,
    };
  }

  createAssessment(
    job: ServiceJob,
    input: CreateServiceJobAssessmentInput,
    actorId: UserId,
    now: Date,
  ): { readonly job: ServiceJob; readonly assessment: ServiceJobAssessment } {
    this.requireVersion(job, input.expectedVersion);
    if (job.status !== "assessment_pending") {
      throw new ServiceJobError(
        "ASSESSMENT_STATUS_INVALID",
        "Assessments can only be created while assessment is pending.",
      );
    }
    const policy = this.cloneChargePolicy(
      input.policy ?? DEFAULT_CHARGE_POLICY,
    );
    if (!Number.isSafeInteger(input.revision) || input.revision <= 0) {
      throw new ServiceJobError(
        "ASSESSMENT_STATUS_INVALID",
        "Assessment revision must be a positive safe integer.",
      );
    }
    const lines = this.cloneAssessmentLines(input.lines);
    return {
      job: {
        ...job,
        updatedAt: this.cloneDate(now),
        updatedBy: actorId,
        version: job.version + 1,
      },
      assessment: {
        id: input.id,
        jobId: job.id,
        revision: input.revision,
        evaluatorId: input.evaluatorId,
        status: "draft",
        lines,
        policy,
        totals: calculateAssessmentTotals(lines, policy),
        approvedAt: null,
        approvedBy: null,
        createdAt: this.cloneDate(now),
        createdBy: actorId,
      },
    };
  }

  approveAssessment(
    job: ServiceJob,
    assessment: ServiceJobAssessment,
    input: ApproveServiceJobAssessmentInput,
    actorId: UserId,
    now: Date,
  ): { readonly job: ServiceJob; readonly assessment: ServiceJobAssessment } {
    this.requireVersion(job, input.expectedVersion);
    this.requireAssessmentJob(job, assessment);
    if (job.status !== "assessment_pending" || assessment.status !== "draft") {
      throw new ServiceJobError(
        "ASSESSMENT_STATUS_INVALID",
        "Only a draft assessment pending on the job can be approved.",
      );
    }

    return {
      job: {
        ...job,
        status: "approved",
        approvedAssessmentId: assessment.id,
        updatedAt: this.cloneDate(now),
        updatedBy: actorId,
        version: job.version + 1,
      },
      assessment: {
        ...this.cloneAssessment(assessment),
        status: "approved",
        approvedAt: this.cloneDate(now),
        approvedBy: input.approverId,
      },
    };
  }

  createBillingDocument(
    job: ServiceJob,
    assessment: ServiceJobAssessment,
    input: CreateBillingDocumentInput,
    actorId: UserId,
    now: Date,
  ): { readonly job: ServiceJob; readonly document: BillingDocument } {
    this.requireVersion(job, input.expectedVersion);
    this.requireAssessmentJob(job, assessment);
    this.requireBillingJobStatus(job);
    if (
      assessment.status !== "approved" ||
      job.approvedAssessmentId !== assessment.id
    ) {
      throw new ServiceJobError(
        "ASSESSMENT_APPROVAL_REQUIRED",
        "An approved assessment is required before issuing an invoice.",
      );
    }
    const lines = this.cloneAssessmentLines(
      this.linesForDocumentKind(assessment.lines, input.kind),
    );
    if (lines.length === 0) {
      throw new ServiceJobError(
        "INVALID_MONEY_VALUE",
        "A billing document must contain at least one applicable line.",
      );
    }
    const policy = this.cloneChargePolicy(assessment.policy);
    return {
      job: {
        ...job,
        status: "invoiced",
        updatedAt: this.cloneDate(now),
        updatedBy: actorId,
        version: job.version + 1,
      },
      document: {
        id: input.id,
        jobId: job.id,
        assessmentId: assessment.id,
        documentNumber: input.documentNumber.trim(),
        kind: input.kind,
        status: "issued",
        customer: this.cloneCustomerSnapshot(job.customer),
        contact: this.cloneContactSnapshot(job.contact),
        asset: this.cloneAssetSnapshot(job.asset),
        lines,
        policy,
        totals: calculateAssessmentTotals(lines, policy),
        issuedAt: this.cloneDate(now),
        issuedBy: actorId,
        voidedAt: null,
        voidReason: null,
      },
    };
  }

  handoff(
    job: ServiceJob,
    input: HandoffServiceJobInput,
    actorId: UserId,
    now: Date,
  ): ServiceJob {
    this.requireVersion(job, input.expectedVersion);
    this.requireTransition(job.status, "handed_off");
    if (!input.customerSignature && !input.overrideReason?.trim()) {
      throw new ServiceJobError(
        "HANDOFF_ACKNOWLEDGEMENT_REQUIRED",
        "Customer signature or an override reason is required for handoff.",
      );
    }

    return {
      ...job,
      status: "handed_off",
      handedOffAt: this.cloneDate(now),
      handoffSignature: input.customerSignature
        ? this.cloneSignature(input.customerSignature)
        : null,
      handoffOverrideReason: input.overrideReason?.trim() || null,
      updatedAt: this.cloneDate(now),
      updatedBy: actorId,
      version: job.version + 1,
    };
  }

  allowedTransitions(status: ServiceJobStatus): readonly ServiceJobStatus[] {
    return [...ALLOWED_TRANSITIONS[status]];
  }

  private requireVersion(job: ServiceJob, expectedVersion: number): void {
    if (job.version !== expectedVersion) {
      throw new ServiceJobError(
        "SERVICE_JOB_VERSION_CONFLICT",
        "The service job has changed. Reload and try again.",
      );
    }
  }

  private requireTransition(
    current: ServiceJobStatus,
    target: ServiceJobStatus,
  ): void {
    if (!ALLOWED_TRANSITIONS[current].includes(target)) {
      throw new ServiceJobError(
        current === "closed" || current === "cancelled"
          ? "SERVICE_JOB_TERMINAL"
          : "INVALID_SERVICE_JOB_TRANSITION",
        `Service job cannot move from ${current} to ${target}.`,
      );
    }
  }

  private requireGenericTransitionTarget(target: ServiceJobStatus): void {
    if (PROTECTED_TRANSITION_TARGETS.has(target)) {
      throw new ServiceJobError(
        "SERVICE_JOB_TRANSITION_PROTECTED",
        `Service job target ${target} requires its dedicated command.`,
      );
    }
  }

  private requireAssignmentInputs(input: AssignServiceJobInput): void {
    const technicianIds = new Set<string>();
    for (const assignment of input.assignments) {
      if (!assignment.technicianName.trim()) {
        throw new ServiceJobError(
          "ASSIGNMENT_NAME_REQUIRED",
          "Technician name is required.",
        );
      }
      if (technicianIds.has(assignment.technicianId)) {
        throw new ServiceJobError(
          "ASSIGNMENT_DUPLICATE_TECHNICIAN",
          "A technician can only be assigned once.",
        );
      }
      technicianIds.add(assignment.technicianId);
    }
  }

  private requireAssessmentJob(
    job: ServiceJob,
    assessment: ServiceJobAssessment,
  ): void {
    if (assessment.jobId !== job.id) {
      throw new ServiceJobError(
        "ASSESSMENT_JOB_MISMATCH",
        "Assessment does not belong to this service job.",
      );
    }
  }

  private requireBillingJobStatus(job: ServiceJob): void {
    if (job.status === "closed" || job.status === "cancelled") {
      throw new ServiceJobError(
        "BILLING_JOB_TERMINAL",
        "Billing documents cannot be issued for terminal service jobs.",
      );
    }
    if (
      job.status !== "approved" &&
      job.status !== "completed" &&
      job.status !== "invoiced"
    ) {
      throw new ServiceJobError(
        "BILLING_JOB_STATUS_INVALID",
        "Billing documents can only be issued for approved, completed, or invoiced service jobs.",
      );
    }
  }

  private cloneCustomerSnapshot(
    snapshot: ServiceJobCustomerSnapshot,
  ): ServiceJobCustomerSnapshot {
    return { ...snapshot };
  }

  private cloneContactSnapshot(
    snapshot: ServiceJobContactSnapshot,
  ): ServiceJobContactSnapshot {
    return { ...snapshot };
  }

  private cloneAssetSnapshot(
    snapshot: ServiceJobAssetSnapshot,
  ): ServiceJobAssetSnapshot {
    return {
      ...snapshot,
      warrantyExpiresAt: this.cloneDateOrNull(snapshot.warrantyExpiresAt),
      includedAccessories: [...snapshot.includedAccessories],
      observedDefects: [...snapshot.observedDefects],
    };
  }

  private cloneAssessmentLines(
    lines: readonly ServiceJobAssessmentLine[],
  ): readonly ServiceJobAssessmentLine[] {
    return lines.map((line) => ({ ...line }));
  }

  private cloneChargePolicy(
    policy: ServiceJobChargePolicy,
  ): ServiceJobChargePolicy {
    return { ...policy };
  }

  private cloneAssessment(
    assessment: ServiceJobAssessment,
  ): ServiceJobAssessment {
    return {
      ...assessment,
      lines: this.cloneAssessmentLines(assessment.lines),
      policy: this.cloneChargePolicy(assessment.policy),
      totals: { ...assessment.totals },
      approvedAt: this.cloneDateOrNull(assessment.approvedAt),
      createdAt: this.cloneDate(assessment.createdAt),
    };
  }

  private cloneEvidence(
    evidence: readonly ServiceJobEvidence[],
  ): readonly ServiceJobEvidence[] {
    return evidence.map((item) => ({
      ...item,
      uploadedAt: this.cloneDate(item.uploadedAt),
    }));
  }

  private cloneSignature(
    signature: ServiceJobCustomerSignature,
  ): ServiceJobCustomerSignature {
    return {
      ...signature,
      signedAt: this.cloneDate(signature.signedAt),
    };
  }

  private cloneDate(date: Date): Date {
    return new Date(date.getTime());
  }

  private cloneDateOrNull(date: Date | null): Date | null {
    return date ? this.cloneDate(date) : null;
  }

  private linesForDocumentKind(
    lines: readonly ServiceJobAssessmentLine[],
    kind: CreateBillingDocumentInput["kind"],
  ): readonly ServiceJobAssessmentLine[] {
    if (kind === "service_invoice") {
      return lines.filter((line) => line.type === "service");
    }
    if (kind === "parts_invoice") {
      return lines.filter((line) => line.type === "part");
    }
    return lines;
  }
}
