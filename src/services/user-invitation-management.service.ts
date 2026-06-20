import "server-only";

import type { AuditLog } from "@/domain/entities/audit-log";
import type { UserProfile } from "@/domain/entities/user-profile";
import { UserManagementError } from "@/domain/errors/user-management.error";
import { UserAccessService } from "@/domain/services/user-access.service";
import { UserInvitationService } from "@/domain/services/user-invitation.service";
import { getFirebaseAdminAuth } from "@/firebase/admin-auth";
import { getClientEnvironment, getServerEnvironment } from "@/lib/env";
import { FirestoreUserInvitationRepository } from "@/repositories/firestore/firestore-user-invitation.repository";
import { FirestoreUserRepository } from "@/repositories/firestore/firestore-user.repository";
import { GoogleWorkspaceEmailService } from "@/services/google-workspace-email.service";
import type { UserManagementRequestContext } from "@/services/user-management.service";

export class UserInvitationManagementService {
  constructor(
    private readonly repository = new FirestoreUserInvitationRepository(),
    private readonly userRepository = new FirestoreUserRepository(),
    private readonly domainService = new UserInvitationService(),
    private readonly accessService = new UserAccessService(),
    private readonly emailProvider = new GoogleWorkspaceEmailService(),
    private readonly auth = getFirebaseAdminAuth(),
  ) {}

  async issue(
    profile: UserProfile,
    context: UserManagementRequestContext,
  ): Promise<void> {
    this.accessService.requireManage(context.actor);
    if (profile.status === "disabled") {
      throw new UserManagementError(
        "INVITATION_INVALID",
        "Enable the user before sending a password invitation.",
      );
    }

    const now = new Date();
    const environment = getServerEnvironment();
    const provision = this.domainService.create(
      profile.uid,
      profile.email,
      profile.displayName,
      context.actor.uid,
      now,
      environment.USER_INVITATION_EXPIRES_IN_HOURS,
    );
    await this.repository.create(
      provision.invitation,
      this.audit(
        "user.invitation_created",
        profile,
        context.actor,
        context,
        now,
        { invitationId: provision.invitation.id },
      ),
    );

    const invitationUrl = new URL(
      "/set-password",
      getClientEnvironment().NEXT_PUBLIC_APP_URL,
    );
    invitationUrl.searchParams.set("token", provision.token);

    try {
      await this.emailProvider.sendUserInvitation({
        to: profile.email,
        displayName: profile.displayName,
        invitationUrl: invitationUrl.toString(),
        expiresAt: provision.invitation.expiresAt,
      });
    } catch {
      throw new UserManagementError(
        "INVITATION_EMAIL_FAILED",
        "The invitation was created, but the email could not be sent. Check SMTP configuration and resend.",
      );
    }
  }

  async inspect(token: string): Promise<{
    email: string;
    displayName: string;
    expiresAt: Date;
  }> {
    const invitation = this.domainService.verify(
      await this.repository.findByTokenHash(
        this.domainService.hashToken(token),
      ),
      new Date(),
    );
    return {
      email: invitation.email,
      displayName: invitation.displayName,
      expiresAt: invitation.expiresAt,
    };
  }

  async redeem(token: string): Promise<string> {
    const now = new Date();
    const tokenHash = this.domainService.hashToken(token);
    const invitation = this.domainService.verify(
      await this.repository.findByTokenHash(tokenHash),
      now,
    );
    const profile = await this.userRepository.findById(invitation.userId);
    if (!profile || profile.status === "disabled") {
      throw new UserManagementError(
        "INVITATION_INVALID",
        "This account is unavailable. Contact an administrator.",
      );
    }

    const resetLink = await this.auth.generatePasswordResetLink(
      invitation.email,
      {
        url: new URL(
          "/login",
          getClientEnvironment().NEXT_PUBLIC_APP_URL,
        ).toString(),
        handleCodeInApp: false,
      },
    );
    const publicContext: UserManagementRequestContext = {
      actor: profile,
      correlationId: crypto.randomUUID(),
      ipAddress: null,
      userAgent: "user-invitation",
    };
    await this.repository.consume(
      tokenHash,
      profile.uid,
      now,
      this.audit(
        "user.invitation_redeemed",
        profile,
        profile,
        publicContext,
        now,
        { invitationId: invitation.id },
      ),
    );
    return resetLink;
  }

  private audit(
    action: string,
    target: UserProfile,
    actor: UserProfile,
    context: UserManagementRequestContext,
    occurredAt: Date,
    changes: Readonly<Record<string, unknown>>,
  ): AuditLog {
    return {
      id: crypto.randomUUID(),
      action,
      entityType: "user",
      entityId: target.uid,
      actorId: actor.uid,
      actorDisplayName: actor.displayName,
      actorRole: actor.role,
      changes,
      occurredAt,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };
  }
}
