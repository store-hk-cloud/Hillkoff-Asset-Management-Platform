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

export interface AnalyticsExpiringWarranty {
  readonly assetCode: string;
  readonly assetName: string;
  readonly customerId: string | null;
  readonly expiresAt: Date;
  readonly daysRemaining: number;
}

export interface ExecutiveDashboardSnapshot {
  readonly generatedAt: Date;
  readonly source: "firebase" | "bigquery";
  readonly totalAssets: number;
  readonly assetsByStatus: Readonly<Record<string, number>>;
  readonly repairCost: number;
  readonly mtbfHours: number | null;
  readonly pmCompletionRate: number;
  readonly warrantyExpiring30: number;
  readonly warrantyExpiring90: number;
  readonly warrantiesByStatus: Readonly<Record<string, number>>;
  readonly expiringWarranties: readonly AnalyticsExpiringWarranty[];
  readonly topFailureAssets: readonly AnalyticsRankedAsset[];
  readonly topRepairCost: readonly AnalyticsRankedAsset[];
  readonly lowStockParts: readonly AnalyticsLowStockPart[];
}
