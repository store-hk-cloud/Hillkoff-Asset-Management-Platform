import type { Entity } from "@/domain/entities/entity";
import type { UserId } from "@/domain/value-objects/user-id";
import type { UserRole } from "@/domain/value-objects/user-role";

export const USER_STATUSES = ["invited", "active", "disabled"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export interface UserProfile extends Entity<UserId> {
  readonly uid: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly phoneNumber: string | null;
  readonly photoURL: string | null;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly warehouseId: string | null;
  readonly customerId: string | null;
  readonly lastLoginAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UserProfileUpdate {
  readonly displayName: string;
  readonly phoneNumber: string | null;
  readonly photoURL: string | null;
  readonly expectedVersion: number;
}

export interface ManagedUserCreateInput {
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly warehouseId: string | null;
  readonly customerId: string | null;
}

export interface ManagedUserUpdateInput {
  readonly displayName: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly warehouseId: string | null;
  readonly customerId: string | null;
  readonly expectedVersion: number;
}
