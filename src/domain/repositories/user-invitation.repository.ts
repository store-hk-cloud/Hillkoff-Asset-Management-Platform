import type { AuditLog } from "@/domain/entities/audit-log";
import type { UserInvitation } from "@/domain/entities/user-invitation";
import type { UserId } from "@/domain/value-objects/user-id";

export interface UserInvitationRepository {
  create(invitation: UserInvitation, auditLog: AuditLog): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<UserInvitation | null>;
  consume(
    tokenHash: string,
    userId: UserId,
    occurredAt: Date,
    auditLog: AuditLog,
  ): Promise<void>;
}
