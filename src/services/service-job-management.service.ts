import { createHash } from "node:crypto";

import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  AssignServiceJobInput,
  BillingDocumentKind,
  CreateServiceJobAssessmentInput,
  CreateServiceJobInput,
  ServiceJob,
  ServiceJobAssessment,
  ServiceJobAssessmentLine,
  ServiceJobChargePolicy,
  ServiceJobCustomerSignature,
  ServiceJobEvidence,
  ServiceJobStatus,
} from "@/domain/entities/service-job";
import type {
  InventoryMovement,
  InventoryPart,
} from "@/domain/entities/inventory";
import type { UserProfile } from "@/domain/entities/user-profile";
import {
  ServiceJobPersistenceError,
  validateServiceJobEventMetadata,
  type BillingDocumentRecord,
  type ServiceJobAssessmentRecord,
  type ServiceJobAssessmentResponse,
  type ServiceJobEvent,
  type ServiceJobEventMetadataValue,
  type ServiceJobExecutionState,
  type ServiceJobEvidenceRecord,
  type ServiceJobIdempotencyRecord,
  type ServiceJobIdempotencyResultValue,
  type ServiceJobListCriteria,
  type ServiceJobListItem,
  type ServiceJobOperation,
  type ServiceJobRecord,
  type ServiceJobRepository,
  type ServiceJobTransaction,
} from "@/domain/repositories/service-job.repository";
import {
  ServiceJobAccessError,
  ServiceJobAccessService,
  type ServiceJobAccessResource,
  type ServiceJobCapability,
} from "@/domain/services/service-job-access.service";
import { ServiceJobDomainService } from "@/domain/services/service-job-domain.service";
import type { UserId } from "@/domain/value-objects/user-id";

export interface ServiceJobRequestContext {
  readonly actor: UserProfile;
  readonly correlationId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

interface IdempotentCommand {
  readonly expectedVersion: number;
  readonly idempotencyKey: string;
}

export interface CreateServiceJobCommand extends CreateServiceJobInput {
  readonly idempotencyKey: string;
  readonly warehouseId: string | null;
}

export interface UpdateServiceJobCommand extends IdempotentCommand {
  readonly title?: string;
  readonly description?: string;
  readonly scheduledStartAt?: Date | null;
}

export interface TransitionServiceJobCommand extends IdempotentCommand {
  readonly targetStatus: ServiceJobStatus;
  readonly scheduledStartAt?: Date;
}

export interface AssignServiceJobCommand extends AssignServiceJobInput {
  readonly idempotencyKey: string;
}

export interface RespondServiceJobAssignmentCommand extends IdempotentCommand {
  readonly response: "accepted" | "rejected";
  readonly rejectionReason?: string;
}

export interface ServiceJobLocationCommand extends IdempotentCommand {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
  readonly capturedAt: Date;
}

export interface RecordServiceJobExecutionCommand extends IdempotentCommand {
  readonly rootCause: string;
  readonly solution: string;
  readonly completionNotes: string;
  readonly checklist: ServiceJobExecutionState["checklist"];
  readonly evidence: readonly Omit<
    ServiceJobEvidenceRecord,
    "uploadedBy" | "uploadedAt"
  >[];
  readonly partsConsumed: ServiceJobExecutionState["partsConsumed"];
  readonly serviceActions: ServiceJobExecutionState["serviceActions"];
}

export interface CreateAssessmentCommand extends IdempotentCommand {
  readonly evaluatorId: UserId;
  readonly lines: readonly ServiceJobAssessmentLine[];
  readonly policy: ServiceJobChargePolicy;
}

export interface ApproveAssessmentCommand extends IdempotentCommand {
  readonly responderName: string;
  readonly respondedAt: Date;
  readonly emergencyOverrideReason: string | null;
}

export interface RejectAssessmentCommand extends IdempotentCommand {
  readonly responderName: string;
  readonly responseReason: string;
  readonly respondedAt: Date;
}

export interface IssueBillingDocumentCommand extends IdempotentCommand {
  readonly assessmentId: string;
  readonly kind: BillingDocumentKind;
  readonly issueDate: Date;
  readonly dueDate: Date;
  readonly paymentTerms: string;
  readonly department: string;
  readonly salesperson: string;
  readonly emergencyOverrideReason: string | null;
}

export interface VoidBillingDocumentCommand extends IdempotentCommand {
  readonly reason: string;
}

export interface IssueServiceJobInventoryCommand extends IdempotentCommand {
  readonly partId: string;
  readonly partExpectedVersion: number;
  readonly quantity: number;
  readonly notes: string;
}

export interface HandoffServiceJobCommand extends IdempotentCommand {
  readonly customerSignature: ServiceJobCustomerSignature | null;
  readonly overrideReason: string | null;
  readonly deliveryNotes: string;
}

interface IdempotentOutcome<T> {
  readonly value: T;
  readonly result: Readonly<Record<string, ServiceJobIdempotencyResultValue>>;
}

const EMPTY_EXECUTION: ServiceJobExecutionState = {
  checkIn: null,
  checkOut: null,
  checklist: [],
  partsConsumed: [],
  serviceActions: [],
  completionNotes: "",
  deliveryNotes: "",
};

const MAX_TRANSACTION_ASSESSMENTS = 100;
const MAX_TRANSACTION_BILLING_DOCUMENTS = 50;

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function hash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function buddhistFiscalYear(date: Date): number {
  const formatted = new Intl.DateTimeFormat("en-US-u-ca-buddhist", {
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(date);
  const year = Number.parseInt(formatted, 10);
  if (!Number.isInteger(year)) {
    throw new ServiceJobPersistenceError(
      "INVALID_PERSISTED_SERVICE_JOB",
      "Unable to determine the Buddhist fiscal year.",
    );
  }
  return year;
}

function cloneExecution(
  execution: ServiceJobExecutionState,
): ServiceJobExecutionState {
  return {
    checkIn: execution.checkIn
      ? {
          ...execution.checkIn,
          capturedAt: new Date(execution.checkIn.capturedAt),
        }
      : null,
    checkOut: execution.checkOut
      ? {
          ...execution.checkOut,
          capturedAt: new Date(execution.checkOut.capturedAt),
        }
      : null,
    checklist: execution.checklist.map((item) => ({ ...item })),
    partsConsumed: execution.partsConsumed.map((item) => ({ ...item })),
    serviceActions: execution.serviceActions.map((item) => ({ ...item })),
    completionNotes: execution.completionNotes,
    deliveryNotes: execution.deliveryNotes,
  };
}

export class ServiceJobManagementService {
  constructor(
    private readonly repository: ServiceJobRepository,
    private readonly domainService = new ServiceJobDomainService(),
    private readonly accessService = new ServiceJobAccessService(),
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async list(
    criteria: Partial<ServiceJobListCriteria>,
    profile: UserProfile,
  ): Promise<readonly ServiceJobListItem[]> {
    this.accessService.require(profile, "list");
    const scoped: ServiceJobListCriteria = {
      status: criteria.status ?? null,
      workType: criteria.workType ?? null,
      warehouseId:
        profile.role === "branch"
          ? profile.warehouseId
          : (criteria.warehouseId ?? null),
      customerId:
        profile.role === "customer"
          ? profile.customerId
          : (criteria.customerId ?? null),
      assignedTechnicianId:
        profile.role === "technician"
          ? profile.uid
          : (criteria.assignedTechnicianId ?? null),
      limit: Math.min(Math.max(criteria.limit ?? 100, 1), 100),
    };
    return this.repository.list(scoped);
  }

  async get(jobId: string, profile: UserProfile): Promise<ServiceJobRecord> {
    const record = await this.repository.findById(jobId);
    if (!record) throw this.notFound(jobId);
    this.accessService.require(profile, "view", this.resource(record));
    return record;
  }

  async listAssessments(
    jobId: string,
    profile: UserProfile,
  ): Promise<readonly ServiceJobAssessmentRecord[]> {
    await this.get(jobId, profile);
    return this.repository.listAssessments(jobId, 50);
  }

  async getAssessment(
    jobId: string,
    assessmentId: string,
    profile: UserProfile,
  ): Promise<ServiceJobAssessmentRecord | null> {
    await this.get(jobId, profile);
    const assessments = await this.repository.listAssessments(jobId, 50);
    return (
      assessments.find((item) => item.assessment.id === assessmentId) ?? null
    );
  }

  async listBillingDocuments(
    jobId: string,
    profile: UserProfile,
  ): Promise<readonly BillingDocumentRecord[]> {
    const record = await this.get(jobId, profile);
    this.accessService.require(profile, "view_billing", this.resource(record));
    return this.repository.listBillingDocuments(jobId, 50);
  }

  async getBillingDocument(
    jobId: string,
    documentId: string,
    profile: UserProfile,
  ): Promise<BillingDocumentRecord | null> {
    const record = await this.get(jobId, profile);
    this.accessService.require(profile, "view_billing", this.resource(record));
    const documents = await this.repository.listBillingDocuments(jobId, 50);
    return documents.find((document) => document.id === documentId) ?? null;
  }

  async create(
    command: CreateServiceJobCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobRecord> {
    this.accessService.require(context.actor, "create");
    if (
      context.actor.role === "branch" &&
      command.warehouseId !== context.actor.warehouseId
    ) {
      throw new ServiceJobAccessError(
        "SERVICE_JOB_ACCESS_DENIED",
        "Branch users can only create service jobs for their own warehouse.",
      );
    }

    const payload = this.withoutIdempotency(command);
    const keyHash = hash(command.idempotencyKey);
    const payloadHash = hash(payload);
    return this.repository.runInTransaction(async (transaction) => {
      const existing = await transaction.getIdempotency(keyHash);
      if (existing) {
        const replay = await transaction.getJob(existing.jobId);
        if (!replay) throw this.notFound(existing.jobId);
        this.accessService.require(
          context.actor,
          "create",
          this.resource(replay),
        );
        this.requireReplay(existing, "service_job.create", payloadHash);
        return replay;
      }

      const id = this.repository.createId("service_job");
      const occurredAt = this.clock();
      const jobValue = this.domainService.create(
        id,
        payload,
        context.actor.uid,
        occurredAt,
      );
      const record: ServiceJobRecord = {
        job: jobValue,
        warehouseId: command.warehouseId,
        execution: cloneExecution(EMPTY_EXECUTION),
      };
      transaction.putJob(record, null);
      this.appendMutation(
        transaction,
        record,
        "service_job.create",
        context,
        occurredAt,
        { status: jobValue.status },
        { status: { before: null, after: jobValue.status } },
      );
      transaction.createIdempotency({
        keyHash,
        operation: "service_job.create",
        jobId: id,
        payloadHash,
        result: { jobId: id, jobVersion: jobValue.version },
        createdAt: occurredAt,
      });
      return record;
    });
  }

  async update(
    jobId: string,
    command: UpdateServiceJobCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobRecord> {
    return this.executeIdempotent(
      "service_job.update",
      jobId,
      command,
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          "update",
          this.resource(current),
        );
        this.requireVersion(current.job, command.expectedVersion);
        const occurredAt = this.clock();
        const updated: ServiceJob = {
          ...current.job,
          title: command.title?.trim() ?? current.job.title,
          description: command.description?.trim() ?? current.job.description,
          scheduledStartAt:
            command.scheduledStartAt === undefined
              ? current.job.scheduledStartAt
              : command.scheduledStartAt
                ? new Date(command.scheduledStartAt)
                : null,
          updatedAt: occurredAt,
          updatedBy: context.actor.uid,
          version: current.job.version + 1,
        };
        const record = { ...current, job: updated };
        transaction.putJob(record, command.expectedVersion);
        this.appendMutation(
          transaction,
          record,
          "service_job.update",
          context,
          occurredAt,
          { status: updated.status },
          { version: { before: current.job.version, after: updated.version } },
        );
        return {
          value: record,
          result: { jobId, jobVersion: updated.version },
        };
      },
      async (transaction) => this.requireRecord(transaction, jobId),
    );
  }

  async transition(
    jobId: string,
    command: TransitionServiceJobCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobRecord> {
    const capability = this.transitionCapability(command.targetStatus);
    return this.executeIdempotent(
      "service_job.transition",
      jobId,
      command,
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          capability,
          this.resource(current),
        );
        const occurredAt = this.clock();
        const updated = this.domainService.transition(
          current.job,
          command,
          context.actor.uid,
          occurredAt,
        );
        const record = { ...current, job: updated };
        transaction.putJob(record, command.expectedVersion);
        this.appendMutation(
          transaction,
          record,
          "service_job.transition",
          context,
          occurredAt,
          { status: updated.status, targetStatus: updated.status },
          {
            status: { before: current.job.status, after: updated.status },
          },
        );
        return {
          value: record,
          result: { jobId, jobVersion: updated.version },
        };
      },
      async (transaction) => this.requireRecord(transaction, jobId),
    );
  }

  async assign(
    jobId: string,
    command: AssignServiceJobCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobRecord> {
    return this.executeIdempotent(
      "service_job.assignment.replace",
      jobId,
      command,
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          "assign",
          this.resource(current),
        );
        const occurredAt = this.clock();
        const updated = this.domainService.assign(
          current.job,
          command,
          context.actor.uid,
          occurredAt,
        );
        const record = { ...current, job: updated };
        transaction.putJob(record, command.expectedVersion);
        transaction.replaceAssignments(jobId, updated.assignments);
        this.appendMutation(
          transaction,
          record,
          "service_job.assignment.replace",
          context,
          occurredAt,
          {
            status: updated.status,
            assignmentCount: updated.assignments.length,
          },
          {
            assignmentCount: {
              before: current.job.assignments.length,
              after: updated.assignments.length,
            },
          },
        );
        return {
          value: record,
          result: { jobId, jobVersion: updated.version },
        };
      },
      async (transaction) => this.requireRecord(transaction, jobId),
    );
  }

  async respondToAssignment(
    jobId: string,
    assignmentId: string,
    command: RespondServiceJobAssignmentCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobRecord> {
    return this.executeIdempotent(
      "service_job.assignment.respond",
      jobId,
      { assignmentId, ...command },
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        const assignment = current.job.assignments.find(
          (item) => item.id === assignmentId,
        );
        if (!assignment) {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "Assignment was not found.",
          );
        }
        if (assignment.status !== "pending") {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "Only a pending assignment can be accepted or rejected.",
          );
        }
        if (
          !this.accessService.canRespondToAssignment(
            context.actor,
            assignment.technicianId,
            this.resource(current),
          )
        ) {
          throw new ServiceJobAccessError(
            "SERVICE_JOB_ACCESS_DENIED",
            "Only the assigned technician can respond to this assignment.",
          );
        }
        this.requireVersion(current.job, command.expectedVersion);
        const rejectionReason = command.rejectionReason?.trim() ?? "";
        if (command.response === "rejected" && !rejectionReason) {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "A rejection reason is required.",
          );
        }
        const occurredAt = this.clock();
        const responded = {
          ...assignment,
          status: command.response,
          respondedAt: occurredAt,
          rejectionReason:
            command.response === "rejected" ? rejectionReason : null,
        };
        const assignments = current.job.assignments.map((item) =>
          item.id === assignmentId ? responded : item,
        );
        const activeAssignments = assignments.filter(
          (item) => item.status !== "rejected",
        );
        const activeLead = activeAssignments.find(
          (item) => item.role === "lead",
        );
        const updated: ServiceJob = {
          ...current.job,
          assignments,
          assignedTechnicianIds: activeAssignments.map(
            (item) => item.technicianId,
          ),
          leadTechnicianId: activeLead?.technicianId ?? null,
          updatedAt: occurredAt,
          updatedBy: context.actor.uid,
          version: current.job.version + 1,
        };
        const record = { ...current, job: updated };
        transaction.putJob(record, command.expectedVersion);
        transaction.putAssignment(jobId, responded);
        this.appendMutation(
          transaction,
          record,
          "service_job.assignment.respond",
          context,
          occurredAt,
          { status: updated.status, response: command.response },
          { assignmentId, response: command.response },
          assignmentId,
        );
        return {
          value: record,
          result: { jobId, assignmentId, jobVersion: updated.version },
        };
      },
      async (transaction) => this.requireRecord(transaction, jobId),
    );
  }

  async checkIn(
    jobId: string,
    command: ServiceJobLocationCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobRecord> {
    return this.recordLocation(
      "service_job.check_in",
      "checkIn",
      jobId,
      command,
      context,
    );
  }

  async checkOut(
    jobId: string,
    command: ServiceJobLocationCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobRecord> {
    return this.recordLocation(
      "service_job.check_out",
      "checkOut",
      jobId,
      command,
      context,
    );
  }

  async recordExecution(
    jobId: string,
    command: RecordServiceJobExecutionCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobRecord> {
    return this.executeIdempotent(
      "service_job.execution.record",
      jobId,
      command,
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          "execute",
          this.resource(current),
        );
        const occurredAt = this.clock();
        const evidenceRecords: ServiceJobEvidenceRecord[] =
          command.evidence.map((item) => ({
            ...item,
            capturedAt: new Date(item.capturedAt),
            uploadedAt: new Date(item.capturedAt),
            uploadedBy: context.actor.uid,
          }));
        const domainEvidence: ServiceJobEvidence[] = evidenceRecords.map(
          ({ id, category, storagePath, uploadedAt, uploadedBy }) => ({
            id,
            category,
            storagePath,
            uploadedAt,
            uploadedBy,
          }),
        );
        const updated = this.domainService.complete(
          current.job,
          {
            expectedVersion: command.expectedVersion,
            rootCause: command.rootCause,
            solution: command.solution,
            evidence: domainEvidence,
          },
          context.actor.uid,
          occurredAt,
        );
        const execution: ServiceJobExecutionState = {
          ...cloneExecution(current.execution),
          checklist: command.checklist.map((item) => ({ ...item })),
          partsConsumed: command.partsConsumed.map((item) => ({ ...item })),
          serviceActions: command.serviceActions.map((item) => ({ ...item })),
          completionNotes: command.completionNotes.trim(),
        };
        const record = { ...current, job: updated, execution };
        transaction.putJob(record, command.expectedVersion);
        transaction.putExecution(jobId, execution);
        transaction.putEvidence(jobId, evidenceRecords);
        this.appendMutation(
          transaction,
          record,
          "service_job.execution.record",
          context,
          occurredAt,
          { status: updated.status },
          {
            status: { before: current.job.status, after: updated.status },
            evidenceCount: evidenceRecords.length,
          },
        );
        return {
          value: record,
          result: { jobId, jobVersion: updated.version },
        };
      },
      async (transaction) => this.requireRecord(transaction, jobId),
    );
  }

  async createAssessment(
    jobId: string,
    command: CreateAssessmentCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobAssessment> {
    return this.executeIdempotent(
      "service_job.assessment.create",
      jobId,
      command,
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          "create_assessment",
          this.resource(current),
        );
        if (command.evaluatorId !== context.actor.uid) {
          throw new ServiceJobAccessError(
            "SERVICE_JOB_ACCESS_DENIED",
            "Assessment evaluator identity must match the authenticated actor.",
          );
        }
        const assessments = await transaction.listAssessments(
          jobId,
          MAX_TRANSACTION_ASSESSMENTS + 1,
        );
        if (assessments.length > MAX_TRANSACTION_ASSESSMENTS) {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "Assessment history exceeds the supported transaction bound.",
          );
        }
        const drafts = assessments.filter((item) => item.status === "draft");
        if (drafts.length > 1) {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "Multiple active assessment drafts require repair before revision.",
          );
        }
        const latestRevision = assessments.reduce(
          (latest, item) => Math.max(latest, item.revision),
          0,
        );
        const revision = latestRevision + 1;
        if (!Number.isSafeInteger(revision)) {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "Assessment revision overflow.",
          );
        }
        const occurredAt = this.clock();
        const input: CreateServiceJobAssessmentInput = {
          id: this.repository.createId("assessment"),
          expectedVersion: command.expectedVersion,
          revision,
          evaluatorId: context.actor.uid,
          lines: command.lines,
          policy: command.policy,
        };
        const created = this.domainService.createAssessment(
          current.job,
          input,
          context.actor.uid,
          occurredAt,
        );
        const record = { ...current, job: created.job };
        transaction.putJob(record, command.expectedVersion);
        const priorDraft = drafts[0];
        if (priorDraft) {
          transaction.putAssessment({
            ...priorDraft,
            status: "superseded",
          });
        }
        transaction.createAssessment(created.assessment);
        this.appendMutation(
          transaction,
          record,
          "service_job.assessment.create",
          context,
          occurredAt,
          { status: created.job.status, assessmentId: created.assessment.id },
          { assessmentId: created.assessment.id },
          created.assessment.id,
        );
        return {
          value: created.assessment,
          result: {
            jobId,
            assessmentId: created.assessment.id,
            jobVersion: created.job.version,
          },
        };
      },
      async (transaction, result) => {
        const assessmentId = String(result.assessmentId ?? "");
        const replay = await transaction.getAssessment(jobId, assessmentId);
        if (!replay) throw this.assessmentNotFound(assessmentId);
        return replay;
      },
    );
  }

  async approveAssessment(
    jobId: string,
    assessmentId: string,
    command: ApproveAssessmentCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobAssessment> {
    return this.executeIdempotent(
      "service_job.assessment.approve",
      jobId,
      { assessmentId, ...command },
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          "approve_assessment",
          this.resource(current),
        );
        const currentAssessment = await transaction.getAssessment(
          jobId,
          assessmentId,
        );
        if (!currentAssessment) throw this.assessmentNotFound(assessmentId);
        const occurredAt = this.clock();
        const approved = this.domainService.approveAssessment(
          current.job,
          currentAssessment,
          {
            expectedVersion: command.expectedVersion,
            approverId: context.actor.uid,
          },
          context.actor.uid,
          occurredAt,
        );
        const response: ServiceJobAssessmentResponse = {
          response: "approved",
          responderName: command.responderName.trim(),
          responseReason: null,
          respondedAt: new Date(command.respondedAt),
          responderId: context.actor.uid,
        };
        const record = { ...current, job: approved.job };
        transaction.putJob(record, command.expectedVersion);
        transaction.putAssessment(approved.assessment);
        transaction.putAssessmentResponse(jobId, assessmentId, response);
        this.appendMutation(
          transaction,
          record,
          "service_job.assessment.approve",
          context,
          occurredAt,
          { status: approved.job.status, assessmentId },
          { assessmentId, response: "approved" },
          assessmentId,
        );
        return {
          value: approved.assessment,
          result: {
            jobId,
            assessmentId,
            jobVersion: approved.job.version,
          },
        };
      },
      async (transaction) => {
        const replay = await transaction.getAssessment(jobId, assessmentId);
        if (!replay) throw this.assessmentNotFound(assessmentId);
        return replay;
      },
    );
  }

  async rejectAssessment(
    jobId: string,
    assessmentId: string,
    command: RejectAssessmentCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobRecord> {
    return this.executeIdempotent(
      "service_job.assessment.reject",
      jobId,
      { assessmentId, ...command },
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          "approve_assessment",
          this.resource(current),
        );
        const currentAssessment = await transaction.getAssessment(
          jobId,
          assessmentId,
        );
        if (!currentAssessment) throw this.assessmentNotFound(assessmentId);
        if (currentAssessment.status !== "draft") {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "Only a draft assessment can be rejected.",
          );
        }
        const occurredAt = this.clock();
        const updated = this.domainService.transition(
          current.job,
          {
            expectedVersion: command.expectedVersion,
            targetStatus: "waiting_customer",
          },
          context.actor.uid,
          occurredAt,
        );
        const response: ServiceJobAssessmentResponse = {
          response: "rejected",
          responderName: command.responderName.trim(),
          responseReason: command.responseReason.trim(),
          respondedAt: new Date(command.respondedAt),
          responderId: context.actor.uid,
        };
        const record = { ...current, job: updated };
        transaction.putJob(record, command.expectedVersion);
        transaction.putAssessmentResponse(jobId, assessmentId, response);
        this.appendMutation(
          transaction,
          record,
          "service_job.assessment.reject",
          context,
          occurredAt,
          {
            status: updated.status,
            assessmentId,
            response: "rejected",
          },
          { assessmentId, response: "rejected" },
          assessmentId,
        );
        return {
          value: record,
          result: { jobId, assessmentId, jobVersion: updated.version },
        };
      },
      async (transaction) => this.requireRecord(transaction, jobId),
    );
  }

  async issueBillingDocument(
    jobId: string,
    command: IssueBillingDocumentCommand,
    context: ServiceJobRequestContext,
  ): Promise<BillingDocumentRecord> {
    return this.executeIdempotent(
      "service_job.billing.issue",
      jobId,
      command,
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          "issue_billing",
          this.resource(current),
        );
        const currentAssessment = await transaction.getAssessment(
          jobId,
          command.assessmentId,
        );
        if (!currentAssessment) {
          throw this.assessmentNotFound(command.assessmentId);
        }
        if (!currentAssessment.approvedBy) {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "The assessment has no immutable approver identity.",
          );
        }
        const billingDocuments = await transaction.listBillingDocuments(
          jobId,
          MAX_TRANSACTION_BILLING_DOCUMENTS + 1,
        );
        if (billingDocuments.length > MAX_TRANSACTION_BILLING_DOCUMENTS) {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "Billing-document history exceeds the supported transaction bound.",
          );
        }
        if (
          billingDocuments.some(
            (document) =>
              document.assessmentId === command.assessmentId &&
              document.kind === command.kind &&
              document.status === "issued",
          )
        ) {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "An active billing document of this kind already exists for the assessment.",
          );
        }
        const separation = this.accessService.requireBillingSeparation(
          context.actor,
          currentAssessment.approvedBy,
          command.emergencyOverrideReason,
        );
        const occurredAt = this.clock();
        const documentNumber = await transaction.nextDocumentNumber({
          fiscalYear: buddhistFiscalYear(command.issueDate),
          warehouseId: current.warehouseId,
          kind: command.kind,
        });
        transaction.reserveDocumentNumber(documentNumber);
        const created = this.domainService.createBillingDocument(
          current.job,
          currentAssessment,
          {
            id: this.repository.createId("billing_document"),
            expectedVersion: command.expectedVersion,
            kind: command.kind,
            documentNumber,
          },
          context.actor.uid,
          occurredAt,
        );
        const document: BillingDocumentRecord = {
          ...created.document,
          issueDate: new Date(command.issueDate),
          dueDate: new Date(command.dueDate),
          paymentTerms: command.paymentTerms.trim(),
          department: command.department.trim(),
          salesperson: command.salesperson.trim(),
          emergencyOverrideReason: separation.reason,
        };
        const record = { ...current, job: created.job };
        transaction.putJob(record, command.expectedVersion);
        transaction.createBillingDocument(document);
        this.appendMutation(
          transaction,
          record,
          "service_job.billing.issue",
          context,
          occurredAt,
          {
            status: created.job.status,
            documentId: document.id,
            documentKind: document.kind,
            documentStatus: document.status,
            emergencyOverride: separation.emergencyOverride,
          },
          {
            documentId: document.id,
            documentKind: document.kind,
            documentNumber,
            emergencyOverride: separation.emergencyOverride,
            emergencyOverrideReason: separation.reason,
          },
          document.id,
        );
        return {
          value: document,
          result: {
            jobId,
            documentId: document.id,
            documentNumber,
            jobVersion: created.job.version,
          },
        };
      },
      async (transaction, result) => {
        const documentId = String(result.documentId ?? "");
        const replay = await transaction.getBillingDocument(jobId, documentId);
        if (!replay) throw this.billingNotFound(documentId);
        return replay;
      },
    );
  }

  async voidBillingDocument(
    jobId: string,
    documentId: string,
    command: VoidBillingDocumentCommand,
    context: ServiceJobRequestContext,
  ): Promise<BillingDocumentRecord> {
    return this.executeIdempotent(
      "service_job.billing.void",
      jobId,
      { documentId, ...command },
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          "void_billing",
          this.resource(current),
        );
        this.requireVersion(current.job, command.expectedVersion);
        const document = await transaction.getBillingDocument(
          jobId,
          documentId,
        );
        if (!document) throw this.billingNotFound(documentId);
        if (document.status !== "issued") {
          throw new ServiceJobPersistenceError(
            "BILLING_DOCUMENT_IMMUTABLE",
            "Only an issued billing document can be voided.",
          );
        }
        const reason = command.reason.trim();
        if (!reason) {
          throw new ServiceJobPersistenceError(
            "BILLING_DOCUMENT_IMMUTABLE",
            "A void reason is required.",
          );
        }
        const occurredAt = this.clock();
        const voided: BillingDocumentRecord = {
          ...document,
          status: "void",
          voidedAt: occurredAt,
          voidReason: reason,
        };
        const updatedJob = this.bump(
          current.job,
          context.actor.uid,
          occurredAt,
        );
        const record = { ...current, job: updatedJob };
        transaction.putJob(record, command.expectedVersion);
        transaction.voidBillingDocument(voided);
        this.appendMutation(
          transaction,
          record,
          "service_job.billing.void",
          context,
          occurredAt,
          {
            status: updatedJob.status,
            documentId,
            documentKind: document.kind,
            documentStatus: "void",
          },
          { documentId, documentNumber: document.documentNumber, reason },
          documentId,
        );
        return {
          value: voided,
          result: {
            jobId,
            documentId,
            documentNumber: document.documentNumber,
            jobVersion: updatedJob.version,
          },
        };
      },
      async (transaction) => {
        const replay = await transaction.getBillingDocument(jobId, documentId);
        if (!replay) throw this.billingNotFound(documentId);
        return replay;
      },
    );
  }

  async issueInventory(
    jobId: string,
    command: IssueServiceJobInventoryCommand,
    context: ServiceJobRequestContext,
  ): Promise<{
    readonly job: ServiceJob;
    readonly movement: InventoryMovement;
  }> {
    return this.executeIdempotent(
      "service_job.inventory.issue",
      jobId,
      command,
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          "issue_inventory",
          this.resource(current),
        );
        this.requireVersion(current.job, command.expectedVersion);
        const part = await transaction.getInventoryPart(command.partId);
        if (!part) {
          throw new ServiceJobPersistenceError(
            "INVENTORY_PART_NOT_FOUND",
            "Inventory part was not found.",
          );
        }
        const issued = this.createInventoryIssue(
          part,
          command,
          jobId,
          context.actor.uid,
        );
        const occurredAt = issued.movement.occurredAt;
        const updatedJob = this.bump(
          current.job,
          context.actor.uid,
          occurredAt,
        );
        const record = { ...current, job: updatedJob };
        transaction.putJob(record, command.expectedVersion);
        transaction.issueInventory(
          issued.part,
          issued.movement,
          command.partExpectedVersion,
        );
        this.appendMutation(
          transaction,
          record,
          "service_job.inventory.issue",
          context,
          occurredAt,
          {
            status: updatedJob.status,
            movementId: issued.movement.id,
            partId: part.id,
            quantity: command.quantity,
          },
          {
            movementId: issued.movement.id,
            partId: part.id,
            quantity: command.quantity,
          },
          issued.movement.id,
        );
        return {
          value: { job: updatedJob, movement: issued.movement },
          result: {
            jobId,
            movementId: issued.movement.id,
            jobVersion: updatedJob.version,
          },
        };
      },
      async (transaction, result) => {
        const movementId = String(result.movementId ?? "");
        const [record, movement] = await Promise.all([
          this.requireRecord(transaction, jobId),
          transaction.getInventoryMovement(movementId),
        ]);
        if (!movement) {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "Idempotent inventory movement was not found.",
          );
        }
        return { job: record.job, movement };
      },
    );
  }

  async handoff(
    jobId: string,
    command: HandoffServiceJobCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobRecord> {
    return this.executeIdempotent(
      "service_job.handoff",
      jobId,
      command,
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          "handoff",
          this.resource(current),
        );
        if (command.overrideReason && context.actor.role !== "admin") {
          throw new ServiceJobAccessError(
            "SERVICE_JOB_ACCESS_DENIED",
            "Only an administrator can override customer handoff acknowledgement.",
          );
        }
        const occurredAt = this.clock();
        const updated = this.domainService.handoff(
          current.job,
          command,
          context.actor.uid,
          occurredAt,
        );
        const execution: ServiceJobExecutionState = {
          ...cloneExecution(current.execution),
          deliveryNotes: command.deliveryNotes.trim(),
        };
        const record = { ...current, job: updated, execution };
        transaction.putJob(record, command.expectedVersion);
        transaction.putExecution(jobId, execution);
        const emergencyOverride = Boolean(command.overrideReason?.trim());
        this.appendMutation(
          transaction,
          record,
          "service_job.handoff",
          context,
          occurredAt,
          {
            status: updated.status,
            signatureCaptured: Boolean(command.customerSignature),
            emergencyOverride,
          },
          {
            signatureCaptured: Boolean(command.customerSignature),
            emergencyOverride,
            emergencyOverrideReason: command.overrideReason?.trim() || null,
          },
        );
        return {
          value: record,
          result: { jobId, jobVersion: updated.version },
        };
      },
      async (transaction) => this.requireRecord(transaction, jobId),
    );
  }

  private async recordLocation(
    operation: "service_job.check_in" | "service_job.check_out",
    field: "checkIn" | "checkOut",
    jobId: string,
    command: ServiceJobLocationCommand,
    context: ServiceJobRequestContext,
  ): Promise<ServiceJobRecord> {
    return this.executeIdempotent(
      operation,
      jobId,
      command,
      context,
      async (transaction) => {
        const current = await this.requireRecord(transaction, jobId);
        this.accessService.require(
          context.actor,
          "execute",
          this.resource(current),
        );
        this.requireVersion(current.job, command.expectedVersion);
        if (field === "checkOut" && !current.execution.checkIn) {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "Check-in is required before check-out.",
          );
        }
        if (
          field === "checkOut" &&
          current.execution.checkIn &&
          command.capturedAt < current.execution.checkIn.capturedAt
        ) {
          throw new ServiceJobPersistenceError(
            "SERVICE_JOB_CHILD_CONFLICT",
            "Check-out cannot occur before check-in.",
          );
        }
        const occurredAt = this.clock();
        const execution: ServiceJobExecutionState = {
          ...cloneExecution(current.execution),
          [field]: {
            latitude: command.latitude,
            longitude: command.longitude,
            accuracyMeters: command.accuracyMeters,
            capturedAt: new Date(command.capturedAt),
            capturedBy: context.actor.uid,
          },
        };
        const updatedJob = this.bump(
          current.job,
          context.actor.uid,
          occurredAt,
        );
        const record = { ...current, job: updatedJob, execution };
        transaction.putJob(record, command.expectedVersion);
        transaction.putExecution(jobId, execution);
        this.appendMutation(
          transaction,
          record,
          operation,
          context,
          occurredAt,
          { status: updatedJob.status },
          { locationCaptured: true },
        );
        return {
          value: record,
          result: { jobId, jobVersion: updatedJob.version },
        };
      },
      async (transaction) => this.requireRecord(transaction, jobId),
    );
  }

  private async executeIdempotent<
    T,
    TCommand extends { readonly idempotencyKey: string },
  >(
    operation: ServiceJobOperation,
    jobId: string,
    command: TCommand,
    context: ServiceJobRequestContext,
    execute: (
      transaction: ServiceJobTransaction,
    ) => Promise<IdempotentOutcome<T>>,
    replay: (
      transaction: ServiceJobTransaction,
      result: ServiceJobIdempotencyRecord["result"],
    ) => Promise<T>,
  ): Promise<T> {
    const keyHash = hash(command.idempotencyKey);
    const payloadHash = hash(this.withoutIdempotency(command));
    return this.repository.runInTransaction(async (transaction) => {
      const existing = await transaction.getIdempotency(keyHash);
      if (existing) {
        await this.requireReplayAuthorization(
          transaction,
          operation,
          jobId,
          command,
          context,
        );
        this.requireReplay(existing, operation, payloadHash, jobId);
        return replay(transaction, existing.result);
      }

      const outcome = await execute(transaction);
      transaction.createIdempotency({
        keyHash,
        operation,
        jobId,
        payloadHash,
        result: outcome.result,
        createdAt: this.clock(),
      });
      return outcome.value;
    });
  }

  private requireReplay(
    existing: ServiceJobIdempotencyRecord,
    operation: ServiceJobOperation,
    payloadHash: string,
    jobId?: string,
  ): void {
    if (
      existing.operation !== operation ||
      existing.payloadHash !== payloadHash ||
      (jobId !== undefined && existing.jobId !== jobId)
    ) {
      throw new ServiceJobPersistenceError(
        "IDEMPOTENCY_CONFLICT",
        "The idempotency key is already bound to a different operation, job, or payload.",
      );
    }
  }

  private async requireReplayAuthorization(
    transaction: ServiceJobTransaction,
    operation: ServiceJobOperation,
    jobId: string,
    command: Readonly<Record<string, unknown>>,
    context: ServiceJobRequestContext,
  ): Promise<void> {
    const record = await this.requireRecord(transaction, jobId);
    const resource = this.resource(record);

    if (operation === "service_job.assignment.respond") {
      const assignmentId = command.assignmentId;
      const assignment = record.job.assignments.find(
        (item) => item.id === assignmentId,
      );
      const response = command.response;
      const isSameActiveTechnician =
        context.actor.status === "active" &&
        context.actor.role === "technician" &&
        assignment?.technicianId === context.actor.uid;
      const isMatchingCompletedResponse =
        assignment?.status === response &&
        (response === "accepted" || response === "rejected");
      if (
        !assignment ||
        !isSameActiveTechnician ||
        !isMatchingCompletedResponse
      ) {
        throw new ServiceJobAccessError(
          "SERVICE_JOB_ACCESS_DENIED",
          "Only the assigned technician can replay this assignment response.",
        );
      }
      return;
    }

    const capability = this.replayCapability(operation, command);
    this.accessService.require(context.actor, capability, resource);
    if (
      operation === "service_job.assessment.create" &&
      command.evaluatorId !== context.actor.uid
    ) {
      throw new ServiceJobAccessError(
        "SERVICE_JOB_ACCESS_DENIED",
        "Assessment evaluator identity must match the authenticated actor.",
      );
    }
  }

  private replayCapability(
    operation: ServiceJobOperation,
    command: Readonly<Record<string, unknown>>,
  ): ServiceJobCapability {
    switch (operation) {
      case "service_job.update":
        return "update";
      case "service_job.transition":
        return this.transitionCapability(
          command.targetStatus as ServiceJobStatus,
        );
      case "service_job.assignment.replace":
        return "assign";
      case "service_job.check_in":
      case "service_job.check_out":
      case "service_job.execution.record":
        return "execute";
      case "service_job.assessment.create":
        return "create_assessment";
      case "service_job.assessment.approve":
      case "service_job.assessment.reject":
        return "approve_assessment";
      case "service_job.billing.issue":
        return "issue_billing";
      case "service_job.billing.void":
        return "void_billing";
      case "service_job.inventory.issue":
        return "issue_inventory";
      case "service_job.handoff":
        return "handoff";
      case "service_job.create":
        return "create";
      case "service_job.assignment.respond":
        return "respond_assignment";
    }
  }

  private transitionCapability(
    targetStatus: ServiceJobStatus,
  ): ServiceJobCapability {
    if (
      targetStatus === "in_progress" ||
      targetStatus === "waiting_parts" ||
      targetStatus === "waiting_customer"
    ) {
      return "execute";
    }
    if (targetStatus === "scheduled") return "schedule";
    if (targetStatus === "closed") return "close";
    if (targetStatus === "cancelled") return "cancel";
    return "update";
  }

  private appendMutation(
    transaction: ServiceJobTransaction,
    record: ServiceJobRecord,
    operation: ServiceJobOperation,
    context: ServiceJobRequestContext,
    occurredAt: Date,
    metadata: Readonly<Record<string, ServiceJobEventMetadataValue>>,
    auditChanges: Readonly<Record<string, unknown>>,
    entityId = record.job.id,
  ): void {
    this.requireSafeEventMetadata(metadata);
    const event: ServiceJobEvent = {
      id: this.repository.createId("event"),
      jobId: record.job.id,
      operation,
      actorId: context.actor.uid,
      actorRole: context.actor.role,
      occurredAt,
      correlationId: context.correlationId,
      metadata,
    };
    const audit: AuditLog = {
      id: this.repository.createId("audit"),
      action: operation,
      entityType: this.auditEntityType(operation),
      entityId,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      changes: { serviceJobId: record.job.id, ...auditChanges },
      occurredAt,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };
    transaction.appendEvent(event);
    transaction.appendAudit(audit);
  }

  private requireSafeEventMetadata(
    metadata: Readonly<Record<string, ServiceJobEventMetadataValue>>,
  ): void {
    validateServiceJobEventMetadata(metadata);
  }

  private auditEntityType(
    operation: ServiceJobOperation,
  ): AuditLog["entityType"] {
    if (operation.includes("assignment")) return "service_job_assignment";
    if (operation.includes("assessment")) return "assessment";
    if (operation.includes("billing")) return "billing_document";
    if (operation === "service_job.handoff") return "handoff";
    return "service_job";
  }

  private createInventoryIssue(
    part: InventoryPart,
    command: IssueServiceJobInventoryCommand,
    jobId: string,
    actorId: UserId,
  ): { readonly part: InventoryPart; readonly movement: InventoryMovement } {
    if (part.version !== command.partExpectedVersion) {
      throw new ServiceJobPersistenceError(
        "INVENTORY_VERSION_CONFLICT",
        "Inventory part has changed. Reload and try again.",
      );
    }
    if (!part.active) {
      throw new ServiceJobPersistenceError(
        "INVENTORY_PART_NOT_FOUND",
        "Inactive inventory parts cannot be issued.",
      );
    }
    if (!Number.isSafeInteger(command.quantity) || command.quantity <= 0) {
      throw new ServiceJobPersistenceError(
        "SERVICE_JOB_CHILD_CONFLICT",
        "Inventory issue quantity must be a positive safe integer.",
      );
    }
    if (part.quantityOnHand < command.quantity) {
      throw new ServiceJobPersistenceError(
        "INVENTORY_VERSION_CONFLICT",
        "Insufficient stock for this service job.",
      );
    }
    const occurredAt = this.clock();
    const movementId = this.repository.createId("inventory_movement");
    const updatedPart: InventoryPart = {
      ...part,
      quantityOnHand: part.quantityOnHand - command.quantity,
      updatedAt: occurredAt,
      updatedBy: actorId,
      version: part.version + 1,
    };
    const movement: InventoryMovement = {
      id: movementId,
      movementNumber: `INV-${occurredAt
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14)}-${movementId.slice(0, 6).toUpperCase()}`,
      type: "issue",
      partId: part.id,
      partNumber: part.partNumber,
      partName: part.name,
      quantity: command.quantity,
      quantityBefore: part.quantityOnHand,
      quantityAfter: updatedPart.quantityOnHand,
      unitCost: part.unitCost,
      referenceType: "service_job",
      referenceId: jobId,
      notes: command.notes.trim(),
      occurredAt,
      actorId,
    };
    return { part: updatedPart, movement };
  }

  private bump(job: ServiceJob, actorId: UserId, occurredAt: Date): ServiceJob {
    return {
      ...job,
      updatedAt: occurredAt,
      updatedBy: actorId,
      version: job.version + 1,
    };
  }

  private requireVersion(job: ServiceJob, expectedVersion: number): void {
    if (job.version !== expectedVersion) {
      throw new ServiceJobPersistenceError(
        "SERVICE_JOB_VERSION_CONFLICT",
        "The service job has changed. Reload and try again.",
      );
    }
  }

  private async requireRecord(
    transaction: ServiceJobTransaction,
    jobId: string,
  ): Promise<ServiceJobRecord> {
    const record = await transaction.getJob(jobId);
    if (!record) throw this.notFound(jobId);
    return record;
  }

  private resource(record: ServiceJobRecord): ServiceJobAccessResource {
    return {
      jobId: record.job.id,
      warehouseId: record.warehouseId,
      customerId: record.job.customer.customerId,
      assignedTechnicianIds: record.job.assignedTechnicianIds,
      assignments: record.job.assignments.map((assignment) => ({
        technicianId: assignment.technicianId,
        status: assignment.status,
      })),
    };
  }

  private withoutIdempotency<T extends { readonly idempotencyKey: string }>(
    command: T,
  ): Omit<T, "idempotencyKey"> {
    const payload = { ...command };
    Reflect.deleteProperty(payload, "idempotencyKey");
    return payload;
  }

  private notFound(jobId: string): ServiceJobPersistenceError {
    return new ServiceJobPersistenceError(
      "SERVICE_JOB_NOT_FOUND",
      `Service job ${jobId} was not found.`,
    );
  }

  private assessmentNotFound(assessmentId: string): ServiceJobPersistenceError {
    return new ServiceJobPersistenceError(
      "ASSESSMENT_NOT_FOUND",
      `Assessment ${assessmentId} was not found.`,
    );
  }

  private billingNotFound(documentId: string): ServiceJobPersistenceError {
    return new ServiceJobPersistenceError(
      "BILLING_DOCUMENT_NOT_FOUND",
      `Billing document ${documentId} was not found.`,
    );
  }
}
