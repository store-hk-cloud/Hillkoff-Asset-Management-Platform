import type {
  UserProfile,
  UserProfileUpdate,
} from "@/domain/entities/user-profile";
import type { UserId } from "@/domain/value-objects/user-id";

export interface UserRepository {
  findById(id: UserId): Promise<UserProfile | null>;
  updateProfile(id: UserId, update: UserProfileUpdate): Promise<UserProfile>;
  recordLogin(id: UserId): Promise<void>;
}
