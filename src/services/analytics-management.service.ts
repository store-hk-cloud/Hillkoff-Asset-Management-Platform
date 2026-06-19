import "server-only";

import type { UserProfile } from "@/domain/entities/user-profile";
import type { AnalyticsRepository } from "@/domain/repositories/analytics.repository";
import { BigQueryAnalyticsRepository } from "@/repositories/bigquery/bigquery-analytics.repository";
import { FirestoreAnalyticsRepository } from "@/repositories/firestore/firestore-analytics.repository";

export class AnalyticsManagementService {
  private readonly repository: AnalyticsRepository;

  constructor(repository?: AnalyticsRepository) {
    this.repository =
      repository ??
      (process.env.ANALYTICS_PROVIDER === "bigquery"
        ? new BigQueryAnalyticsRepository()
        : new FirestoreAnalyticsRepository());
  }

  canView(profile: UserProfile): boolean {
    return profile.role === "admin" || profile.role === "executive";
  }

  async executiveDashboard(profile: UserProfile) {
    if (!this.canView(profile)) throw new Error("Analytics access denied.");
    return this.repository.getExecutiveSnapshot();
  }
}
