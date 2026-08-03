import type { UserProfile } from "@/domain/entities/user-profile";
import type { ServiceJobAssignmentStatus } from "@/domain/entities/service-job";
import type { DomainService } from "@/domain/services/domain-service";
import type { UserId } from "@/domain/value-objects/user-id";
import type { UserRole } from "@/domain/value-objects/user-role";

export const SERVICE_JOB_CAPABILITIES = [
  "list",
  "view",
  "create",
  "update",
  "schedule",
  "assign",
  "respond_assignment",
  "execute",
  "create_assessment",
  "approve_assessment",
  "view_billing",
  "issue_billing",
  "void_billing",
  "issue_inventory",
  "handoff",
  "close",
  "cancel",
  "report",
] as const;

export type ServiceJobCapability = (typeof SERVICE_JOB_CAPABILITIES)[number];

export const SERVICE_JOB_ROLE_CAPABILITIES = {
  admin: [...SERVICE_JOB_CAPABILITIES],
  executive: ["list", "view", "view_billing", "report"],
  sales: [
    "list",
    "view",
    "create",
    "update",
    "schedule",
    "create_assessment",
    "view_billing",
  ],
  warehouse: [
    "list",
    "view",
    "create",
    "view_billing",
    "issue_inventory",
    "handoff",
  ],
  technician: [
    "list",
    "view",
    "respond_assignment",
    "execute",
    "create_assessment",
  ],
  branch: ["list", "view", "create"],
  customer: ["list", "view", "approve_assessment", "view_billing"],
} as const satisfies Readonly<
  Record<UserRole, readonly ServiceJobCapability[]>
>;

export interface ServiceJobAccessResource {
  readonly jobId: string;
  readonly warehouseId: string | null;
  readonly customerId: string | null;
  readonly assignedTechnicianIds: readonly UserId[];
  readonly assignments: readonly {
    readonly technicianId: UserId;
    readonly status: ServiceJobAssignmentStatus;
  }[];
}

export type ServiceJobAccessErrorCode =
  | "SERVICE_JOB_ACCESS_DENIED"
  | "SERVICE_JOB_SEPARATION_OF_DUTIES"
  | "SERVICE_JOB_OVERRIDE_REASON_REQUIRED";

export class ServiceJobAccessError extends Error {
  readonly name = "ServiceJobAccessError";

  constructor(
    readonly code: ServiceJobAccessErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface BillingSeparationDecision {
  readonly emergencyOverride: boolean;
  readonly reason: string | null;
}

const GLOBAL_SCOPE_ROLES = new Set<UserRole>([
  "admin",
  "executive",
  "sales",
  "warehouse",
]);

export class ServiceJobAccessService implements DomainService {
  readonly serviceName = "ServiceJobAccessService";

  capabilitiesFor(role: UserRole): readonly ServiceJobCapability[] {
    return [...SERVICE_JOB_ROLE_CAPABILITIES[role]];
  }

  can(
    profile: UserProfile,
    capability: ServiceJobCapability,
    resource?: ServiceJobAccessResource,
  ): boolean {
    if (
      !(
        SERVICE_JOB_ROLE_CAPABILITIES[
          profile.role
        ] as readonly ServiceJobCapability[]
      ).includes(capability)
    ) {
      return false;
    }

    if (GLOBAL_SCOPE_ROLES.has(profile.role)) return true;

    if (profile.role === "branch") {
      if (!profile.warehouseId) return false;
      return resource
        ? resource.warehouseId === profile.warehouseId
        : capability === "list" || capability === "create";
    }

    if (profile.role === "customer") {
      if (!profile.customerId) return false;
      return resource
        ? resource.customerId === profile.customerId
        : capability === "list";
    }

    if (profile.role === "technician") {
      if (!resource) return capability === "list";
      const assignment = resource.assignments.find(
        (item) => item.technicianId === profile.uid,
      );
      if (!assignment || assignment.status === "rejected") return false;
      if (assignment.status === "pending") {
        return capability === "view" || capability === "respond_assignment";
      }
      return (
        capability === "view" ||
        capability === "execute" ||
        capability === "create_assessment"
      );
    }

    return false;
  }

  require(
    profile: UserProfile,
    capability: ServiceJobCapability,
    resource?: ServiceJobAccessResource,
  ): void {
    if (!this.can(profile, capability, resource)) {
      throw new ServiceJobAccessError(
        "SERVICE_JOB_ACCESS_DENIED",
        `The ${profile.role} role cannot perform ${capability} on this service job.`,
      );
    }
  }

  canRespondToAssignment(
    profile: UserProfile,
    assignmentTechnicianId: UserId,
    resource: ServiceJobAccessResource,
  ): boolean {
    const assignment = resource.assignments.find(
      (item) => item.technicianId === assignmentTechnicianId,
    );
    if (!assignment || assignment.status !== "pending") return false;
    if (profile.role === "admin") return true;
    return (
      profile.role === "technician" &&
      profile.uid === assignmentTechnicianId &&
      this.can(profile, "respond_assignment", resource)
    );
  }

  requireBillingSeparation(
    issuer: UserProfile,
    approverId: UserId,
    emergencyOverrideReason: string | null | undefined,
  ): BillingSeparationDecision {
    if (issuer.uid !== approverId) {
      return { emergencyOverride: false, reason: null };
    }

    if (issuer.role !== "admin") {
      throw new ServiceJobAccessError(
        "SERVICE_JOB_SEPARATION_OF_DUTIES",
        "The assessment approver and billing issuer must be different actors.",
      );
    }

    const reason = emergencyOverrideReason?.trim() ?? "";
    if (!reason) {
      throw new ServiceJobAccessError(
        "SERVICE_JOB_OVERRIDE_REASON_REQUIRED",
        "An admin emergency override requires a reason.",
      );
    }

    return { emergencyOverride: true, reason };
  }
}
