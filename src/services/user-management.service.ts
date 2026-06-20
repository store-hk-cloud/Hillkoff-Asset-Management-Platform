import "server-only";

import { randomBytes } from "node:crypto";

import type { UserRecord } from "firebase-admin/auth";

import type { AuditLog } from "@/domain/entities/audit-log";
import type {
  ManagedUserCreateInput,
  ManagedUserUpdateInput,
  UserProfile,
} from "@/domain/entities/user-profile";
import { UserManagementError } from "@/domain/errors/user-management.error";
import { UserAccessService } from "@/domain/services/user-access.service";
import { createUserId } from "@/domain/value-objects/user-id";
import { getFirebaseAdminAuth } from "@/firebase/admin-auth";
import { getClientEnvironment } from "@/lib/env";
import { FirestoreUserRepository } from "@/repositories/firestore/firestore-user.repository";

export interface UserManagementRequestContext {
  readonly actor: UserProfile;
  readonly correlationId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export class UserManagementService {
  constructor(
    private readonly repository = new FirestoreUserRepository(),
    private readonly accessService = new UserAccessService(),
    private readonly auth = getFirebaseAdminAuth(),
  ) {}

  async list(actor: UserProfile): Promise<readonly UserProfile[]> {
    this.accessService.requireManage(actor);
    return this.repository.list();
  }

  async get(id: string, actor: UserProfile): Promise<UserProfile> {
    this.accessService.requireManage(actor);
    const profile = await this.repository.findById(createUserId(id));
    if (!profile) {
      throw new UserManagementError(
        "USER_NOT_FOUND",
        "User profile was not found.",
      );
    }
    return profile;
  }

  async create(
    input: ManagedUserCreateInput,
    context: UserManagementRequestContext,
  ): Promise<UserProfile> {
    this.accessService.requireManage(context.actor);
    const normalized = this.accessService.validateCreate(input);
    let authUser: UserRecord;

    try {
      authUser = await this.auth.createUser({
        email: normalized.email,
        displayName: normalized.displayName,
        password: this.generateTemporaryPassword(),
        disabled: false,
        emailVerified: false,
      });
    } catch (error) {
      if ((error as { code?: string }).code === "auth/email-already-exists") {
        throw new UserManagementError(
          "USER_EMAIL_CONFLICT",
          "This email address already has an account.",
        );
      }
      throw error;
    }

    const now = new Date();
    const uid = createUserId(authUser.uid);
    const profile: UserProfile = {
      id: uid,
      uid,
      email: normalized.email,
      displayName: normalized.displayName,
      phoneNumber: null,
      photoURL: null,
      role: normalized.role,
      status: "active",
      branchId: normalized.branchId,
      customerId: normalized.customerId,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };

    try {
      await this.auth.setCustomUserClaims(uid, { role: normalized.role });
      await this.sendPasswordReset(normalized.email);
      await this.repository.createManaged(
        profile,
        this.audit("user.created", profile, context, now, {
          role: normalized.role,
          status: "active",
          branchId: normalized.branchId,
          customerId: normalized.customerId,
        }),
      );
    } catch (error) {
      await this.auth.deleteUser(uid).catch(() => undefined);
      throw error;
    }

    return profile;
  }

  async update(
    id: string,
    input: ManagedUserUpdateInput,
    context: UserManagementRequestContext,
  ): Promise<UserProfile> {
    this.accessService.requireManage(context.actor);
    const targetId = createUserId(id);
    const current = await this.get(id, context.actor);
    const normalized = this.accessService.validateUpdate(
      context.actor,
      targetId,
      input,
    );
    const requiresRevocation =
      current.role !== normalized.role || current.status !== normalized.status;
    const authUser = await this.auth.getUser(targetId);
    const previousClaims = authUser.customClaims ?? {};

    await this.auth.updateUser(targetId, {
      displayName: normalized.displayName,
      disabled: normalized.status === "disabled",
    });
    await this.auth.setCustomUserClaims(targetId, {
      ...previousClaims,
      role: normalized.role,
    });

    try {
      const now = new Date();
      const updated = await this.repository.updateManaged(
        targetId,
        normalized,
        this.audit("user.access_updated", current, context, now, {
          displayName: {
            before: current.displayName,
            after: normalized.displayName,
          },
          role: { before: current.role, after: normalized.role },
          status: { before: current.status, after: normalized.status },
          branchId: { before: current.branchId, after: normalized.branchId },
          customerId: {
            before: current.customerId,
            after: normalized.customerId,
          },
        }),
      );
      if (requiresRevocation) {
        await this.auth.revokeRefreshTokens(targetId);
      }
      return updated;
    } catch (error) {
      await this.auth.updateUser(targetId, {
        displayName: authUser.displayName ?? null,
        disabled: authUser.disabled,
      });
      await this.auth.setCustomUserClaims(targetId, previousClaims);
      throw error;
    }
  }

  async sendPasswordReset(
    email: string,
    actor?: UserProfile,
    context?: UserManagementRequestContext,
  ): Promise<void> {
    if (actor) this.accessService.requireManage(actor);
    const apiKey = getClientEnvironment().NEXT_PUBLIC_FIREBASE_API_KEY;
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      throw new UserManagementError(
        "USER_NOT_FOUND",
        "Password reset email could not be sent.",
      );
    }

    if (actor && context) {
      const profile = await this.repository.findById(
        createUserId((await this.auth.getUserByEmail(email)).uid),
      );
      if (profile) {
        await this.repository.recordAudit(
          this.audit("user.password_reset_sent", profile, context, new Date(), {
            email,
          }),
        );
      }
    }
  }

  private generateTemporaryPassword(): string {
    return `${randomBytes(32).toString("base64url")}Aa1!`;
  }

  private audit(
    action: string,
    target: UserProfile,
    context: UserManagementRequestContext,
    occurredAt: Date,
    changes: Readonly<Record<string, unknown>>,
  ): AuditLog {
    return {
      id: crypto.randomUUID(),
      action,
      entityType: "user",
      entityId: target.uid,
      actorId: context.actor.uid,
      actorDisplayName: context.actor.displayName,
      actorRole: context.actor.role,
      changes,
      occurredAt,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };
  }
}
