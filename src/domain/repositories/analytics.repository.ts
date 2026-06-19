import type { ExecutiveDashboardSnapshot } from "@/domain/entities/analytics";

export interface AnalyticsRepository {
  getExecutiveSnapshot(): Promise<ExecutiveDashboardSnapshot>;
}
