import type { UserId } from "@/domain/value-objects/user-id";
import type { UserRole } from "@/domain/value-objects/user-role";

export interface AuditLog {
  readonly id: string;
  readonly action: string;
  readonly entityType: "asset" | "user";
  readonly entityId: string;
  readonly actorId: UserId;
  readonly actorDisplayName: string;
  readonly actorRole: UserRole;
  readonly changes: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
  readonly correlationId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}
