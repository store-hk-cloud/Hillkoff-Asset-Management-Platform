export interface AnalyticsRankedAsset {
  readonly assetId: string;
  readonly assetCode: string;
  readonly assetName: string;
  readonly value: number;
}

export interface AnalyticsLowStockPart {
  readonly partNumber: string;
  readonly name: string;
  readonly quantityOnHand: number;
  readonly reorderPoint: number;
}

export interface ExecutiveDashboardSnapshot {
  readonly generatedAt: Date;
  readonly source: "firebase" | "bigquery";
  readonly totalAssets: number;
  readonly assetsByStatus: Readonly<Record<string, number>>;
  readonly repairCost: number;
  readonly mtbfHours: number | null;
  readonly pmCompletionRate: number;
  readonly topFailureAssets: readonly AnalyticsRankedAsset[];
  readonly topRepairCost: readonly AnalyticsRankedAsset[];
  readonly lowStockParts: readonly AnalyticsLowStockPart[];
}
