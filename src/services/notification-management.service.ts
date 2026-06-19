import "server-only";

import type { UserProfile } from "@/domain/entities/user-profile";
import { FirestoreNotificationRepository } from "@/repositories/firestore/firestore-notification.repository";

export class NotificationManagementService {
  constructor(
    private readonly repository = new FirestoreNotificationRepository(),
  ) {}

  canView(profile: UserProfile): boolean {
    return profile.role === "admin" || profile.role === "executive";
  }

  async list(profile: UserProfile) {
    if (!this.canView(profile)) {
      throw new Error("Notification access denied.");
    }
    return this.repository.list();
  }
}
