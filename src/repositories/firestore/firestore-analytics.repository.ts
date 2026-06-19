import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import type {
  AnalyticsRankedAsset,
  ExecutiveDashboardSnapshot,
} from "@/domain/entities/analytics";
import type { AnalyticsRepository } from "@/domain/repositories/analytics.repository";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

export class FirestoreAnalyticsRepository implements AnalyticsRepository {
  async getExecutiveSnapshot(): Promise<ExecutiveDashboardSnapshot> {
    const firestore = getFirebaseAdminFirestore();
    const [assets, repairs, pmJobs, parts] = await Promise.all([
      firestore.collection("assets").get(),
      firestore.collection("repair_tickets").get(),
      firestore.collection("pm_jobs").get(),
      firestore.collection("inventory_parts").get(),
    ]);

    const assetsByStatus: Record<string, number> = {};
    const assetNames = new Map<string, { code: string; name: string }>();
    assets.docs.forEach((document) => {
      const data = document.data();
      const status = typeof data.status === "string" ? data.status : "unknown";
      assetsByStatus[status] = (assetsByStatus[status] ?? 0) + 1;
      assetNames.set(document.id, {
        code: String(data.assetCode ?? document.id),
        name: String(data.name ?? "Unknown"),
      });
    });

    let repairCost = 0;
    const failureCount = new Map<string, number>();
    const repairCostByAsset = new Map<string, number>();
    const repairDates = new Map<string, Date[]>();
    repairs.docs.forEach((document) => {
      const data = document.data();
      if (data.status !== "completed" && data.status !== "closed") return;
      const partsCost = Array.isArray(data.partsUsed)
        ? data.partsUsed.reduce(
            (total: number, part: Record<string, unknown>) =>
              total + Number(part.quantity ?? 0) * Number(part.unitCost ?? 0),
            0,
          )
        : 0;
      const cost = Number(data.laborCost ?? 0) + partsCost;
      const assetId = String(data.assetId ?? "");
      repairCost += cost;
      failureCount.set(assetId, (failureCount.get(assetId) ?? 0) + 1);
      repairCostByAsset.set(
        assetId,
        (repairCostByAsset.get(assetId) ?? 0) + cost,
      );
      if (data.completedAt instanceof Timestamp) {
        repairDates.set(assetId, [
          ...(repairDates.get(assetId) ?? []),
          data.completedAt.toDate(),
        ]);
      }
    });

    const intervals: number[] = [];
    repairDates.forEach((dates) => {
      dates
        .sort((left, right) => left.getTime() - right.getTime())
        .forEach((date, index) => {
          const previous = dates[index - 1];
          if (previous) intervals.push(date.getTime() - previous.getTime());
        });
    });

    let completedPm = 0;
    let totalPm = 0;
    pmJobs.docs.forEach((document) => {
      const status = document.get("status");
      if (status === "scheduled" || status === "completed") totalPm += 1;
      if (status === "completed") completedPm += 1;
    });

    const rank = (
      values: Map<string, number>,
    ): readonly AnalyticsRankedAsset[] =>
      [...values.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([assetId, value]) => ({
          assetId,
          assetCode: assetNames.get(assetId)?.code ?? assetId,
          assetName: assetNames.get(assetId)?.name ?? "Unknown",
          value,
        }));

    return {
      generatedAt: new Date(),
      source: "firebase",
      totalAssets: assets.size,
      assetsByStatus,
      repairCost,
      mtbfHours:
        intervals.length === 0
          ? null
          : intervals.reduce((sum, value) => sum + value, 0) /
            intervals.length /
            3_600_000,
      pmCompletionRate: totalPm === 0 ? 0 : (completedPm / totalPm) * 100,
      topFailureAssets: rank(failureCount),
      topRepairCost: rank(repairCostByAsset),
      lowStockParts: parts.docs
        .map((document) => document.data())
        .filter(
          (part) =>
            part.active === true &&
            Number(part.quantityOnHand) <= Number(part.reorderPoint),
        )
        .map((part) => ({
          partNumber: String(part.partNumber),
          name: String(part.name),
          quantityOnHand: Number(part.quantityOnHand),
          reorderPoint: Number(part.reorderPoint),
        }))
        .slice(0, 20),
    };
  }
}
