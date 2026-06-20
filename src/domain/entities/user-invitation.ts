import type { UserId } from "@/domain/value-objects/user-id";

export const USER_INVITATION_STATUSES = ["pending", "used", "revoked"] as const;

export type UserInvitationStatus = (typeof USER_INVITATION_STATUSES)[number];

export interface UserInvitation {
  readonly id: string;
  readonly userId: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly tokenHash: string;
  readonly status: UserInvitationStatus;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly createdBy: UserId;
  readonly usedAt: Date | null;
}
