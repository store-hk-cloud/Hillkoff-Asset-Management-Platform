import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/dal";
import { AnalyticsManagementService } from "@/services/analytics-management.service";

const analytics = new AnalyticsManagementService();

export const metadata = { title: "Executive Dashboard" };

export default async function DashboardPage() {
  const { profile } = await requireSession();

  if (!analytics.canView(profile)) {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-muted-foreground text-sm">Welcome</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {profile.displayName}
          </h1>
        </div>
        <Card>
          <CardContent className="py-6 text-sm">
            <p>{profile.email}</p>
            <p className="text-muted-foreground">{profile.role}</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const snapshot = await analytics.executiveDashboard(profile);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            Executive Analytics · {snapshot.source}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Executive Dashboard
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/api/analytics/export/excel">Export Excel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/api/analytics/export/pdf">Export PDF</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Total Assets" value={snapshot.totalAssets.toString()} />
        <Metric
          title="Repair Cost"
          value={`${snapshot.repairCost.toLocaleString("th-TH")} THB`}
        />
        <Metric
          title="MTBF"
          value={
            snapshot.mtbfHours === null
              ? "N/A"
              : `${snapshot.mtbfHours.toFixed(1)} hours`
          }
        />
        <Metric
          title="PM Completion Rate"
          value={`${snapshot.pmCompletionRate.toFixed(1)}%`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard
          items={Object.entries(snapshot.assetsByStatus).map(
            ([label, value]) => ({ label, value: value.toString() }),
          )}
          title="Assets By Status"
        />
        <ListCard
          items={snapshot.lowStockParts.map((part) => ({
            label: `${part.partNumber} · ${part.name}`,
            value: `${part.quantityOnHand}/${part.reorderPoint}`,
          }))}
          title="Low Stock Parts"
        />
        <ListCard
          items={snapshot.topFailureAssets.map((asset) => ({
            label: `${asset.assetCode} · ${asset.assetName}`,
            value: asset.value.toString(),
          }))}
          title="Top Failure Assets"
        />
        <ListCard
          items={snapshot.topRepairCost.map((asset) => ({
            label: `${asset.assetCode} · ${asset.assetName}`,
            value: `${asset.value.toLocaleString("th-TH")} THB`,
          }))}
          title="Top Repair Cost"
        />
      </div>
    </section>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function ListCard({
  title,
  items,
}: {
  title: string;
  items: readonly { label: string; value: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {items.length === 0 ? (
          <p className="text-muted-foreground">No data</p>
        ) : (
          items.map((item) => (
            <div
              className="flex items-center justify-between gap-4"
              key={item.label}
            >
              <span>{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
