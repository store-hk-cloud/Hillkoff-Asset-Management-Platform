import { createHash, randomBytes } from "node:crypto";

import type { UserInvitation } from "@/domain/entities/user-invitation";
import { UserManagementError } from "@/domain/errors/user-management.error";
import type { DomainService } from "@/domain/services/domain-service";
import type { UserId } from "@/domain/value-objects/user-id";

export interface InvitationProvision {
  readonly invitation: UserInvitation;
  readonly token: string;
}

export class UserInvitationService implements DomainService {
  readonly serviceName = "UserInvitationService";

  create(
    userId: UserId,
    email: string,
    displayName: string,
    actorId: UserId,
    now: Date,
    lifetimeHours = 72,
  ): InvitationProvision {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = this.hashToken(token);

    return {
      token,
      invitation: {
        id: tokenHash,
        userId,
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        tokenHash,
        status: "pending",
        expiresAt: new Date(now.getTime() + lifetimeHours * 60 * 60 * 1000),
        createdAt: now,
        createdBy: actorId,
        usedAt: null,
      },
    };
  }

  verify(invitation: UserInvitation | null, now: Date): UserInvitation {
    if (!invitation || invitation.status !== "pending") {
      throw new UserManagementError(
        "INVITATION_INVALID",
        "This invitation is invalid or has already been used.",
      );
    }

    if (invitation.expiresAt.getTime() <= now.getTime()) {
      throw new UserManagementError(
        "INVITATION_EXPIRED",
        "This invitation has expired. Ask an administrator to send a new one.",
      );
    }

    return invitation;
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
