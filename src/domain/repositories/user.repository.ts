import type {
  ManagedUserUpdateInput,
  UserProfile,
  UserProfileUpdate,
} from "@/domain/entities/user-profile";
import type { AuditLog } from "@/domain/entities/audit-log";
import type { UserId } from "@/domain/value-objects/user-id";

export interface UserRepository {
  findById(id: UserId): Promise<UserProfile | null>;
  list(): Promise<readonly UserProfile[]>;
  createManaged(profile: UserProfile, auditLog: AuditLog): Promise<void>;
  updateManaged(
    id: UserId,
    update: ManagedUserUpdateInput,
    auditLog: AuditLog,
  ): Promise<UserProfile>;
  recordAudit(auditLog: AuditLog): Promise<void>;
  updateProfile(id: UserId, update: UserProfileUpdate): Promise<UserProfile>;
  recordLogin(id: UserId): Promise<void>;
}
