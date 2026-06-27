import "server-only";

import type { UserProfile } from "@/domain/entities/user-profile";
import { NotificationError } from "@/domain/errors/notification.error";
import { FirestoreNotificationRepository } from "@/repositories/firestore/firestore-notification.repository";

export class NotificationManagementService {
  constructor(
    private readonly repository = new FirestoreNotificationRepository(),
  ) {}

  canView(profile: UserProfile): boolean {
    return (
      profile.role === "admin" ||
      profile.role === "executive" ||
      profile.role === "technician"
    );
  }

  async list(profile: UserProfile) {
    if (!this.canView(profile)) {
      throw new NotificationError(
        "NOTIFICATION_ACCESS_DENIED",
        "You do not have access to the notification queue.",
      );
    }
    return this.repository.list(
      profile.role === "technician" ? profile.uid : null,
    );
  }
}
