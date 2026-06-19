import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssetAccessService } from "@/domain/services/asset-access.service";
import { AssetSearchForm } from "@/features/assets/components/asset-search-form";
import { AssetStatusBadge } from "@/features/assets/components/asset-status-badge";
import { assetSearchSchema } from "@/features/assets/schemas/asset.schema";
import { requireSession } from "@/lib/auth/dal";
import { AssetManagementService } from "@/services/asset-management.service";

const assetService = new AssetManagementService();
const accessService = new AssetAccessService();

type AssetsPageProps = {
  searchParams: Promise<{
    query?: string;
    status?: string;
  }>;
};

export const metadata = {
  title: "Assets",
};

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  const { profile } = await requireSession();
  const params = await searchParams;
  const criteria = assetSearchSchema.parse({
    query: params.query ?? "",
    status: params.status ?? "active",
    limit: 50,
  });
  const assets = await assetService.list(criteria, profile);
  const canWrite = accessService.canWrite(profile);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Asset Management</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            ทรัพย์สิน
          </h1>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link href="/assets/new">
              <Plus aria-hidden="true" className="size-4" />
              เพิ่มทรัพย์สิน
            </Link>
          </Button>
        ) : null}
      </div>

      <AssetSearchForm query={criteria.query} status={criteria.status} />

      {assets.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          ไม่พบทรัพย์สินตามเงื่อนไข
        </div>
      ) : (
        <div className="grid gap-3">
          {assets.map((asset) => (
            <Link href={`/assets/${asset.id}`} key={asset.id}>
              <Card className="hover:bg-accent/40 py-0 transition-colors">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                  <div>
                    <p className="font-mono text-sm font-semibold">
                      {asset.assetCode}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {asset.category}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {asset.locationName || "ไม่ระบุสถานที่"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AssetStatusBadge condition={asset.condition} />
                    <AssetStatusBadge status={asset.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
