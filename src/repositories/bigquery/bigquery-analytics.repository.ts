import "server-only";

import type { ExecutiveDashboardSnapshot } from "@/domain/entities/analytics";
import type { AnalyticsRepository } from "@/domain/repositories/analytics.repository";

export class BigQueryAnalyticsRepository implements AnalyticsRepository {
  async getExecutiveSnapshot(): Promise<ExecutiveDashboardSnapshot> {
    throw new Error(
      "BigQuery analytics adapter is prepared but not enabled. Set ANALYTICS_PROVIDER only after deploying the documented BigQuery views.",
    );
  }
}
