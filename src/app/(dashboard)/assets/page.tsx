import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssetAccessService } from "@/domain/services/asset-access.service";
import { AssetSearchForm } from "@/features/assets/components/asset-search-form";
import { AssetStatusBadge } from "@/features/assets/components/asset-status-badge";
import { assetSearchSchema } from "@/features/assets/schemas/asset.schema";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { AssetManagementService } from "@/services/asset-management.service";
import { ASSET_CATEGORIES } from "@/domain/master-data/asset-categories";

const assetService = new AssetManagementService();
const accessService = new AssetAccessService();

type AssetsPageProps = {
  searchParams: Promise<{
    query?: string;
    status?: string;
    categoryKey?: string;
  }>;
};

export const metadata = {
  title: "Assets",
};

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  const params = await searchParams;
  const criteria = assetSearchSchema.parse({
    query: params.query ?? "",
    status: params.status ?? "active",
    limit: 50,
    categoryKey: params.categoryKey ?? "all",
  });
  const [assets, categoryCounts] = await Promise.all([
    assetService.list(criteria, profile),
    assetService.getCategoryCounts({ status: criteria.status }, profile),
  ]);
  const canWrite = accessService.canWrite(profile);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {t("assets.management")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("assets.title")}
          </h1>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link href="/assets/new">
              <Plus aria-hidden="true" className="size-4" />
              {t("assets.add")}
            </Link>
          </Button>
        ) : null}
      </div>

      <AssetSearchForm
        categoryKey={criteria.categoryKey}
        query={criteria.query}
        status={criteria.status}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ASSET_CATEGORIES.map((category) => {
          const active = criteria.categoryKey === category.key;
          const href = new URLSearchParams({
            status: criteria.status,
            categoryKey: category.key,
            ...(criteria.query ? { query: criteria.query } : {}),
          });
          return (
            <Link href={`/assets?${href}`} key={category.key}>
              <Card
                className={
                  active
                    ? "border-primary bg-primary/5 py-0"
                    : "hover:bg-accent/40 py-0"
                }
              >
                <CardContent className="p-3">
                  <p className="text-muted-foreground text-xs">
                    {locale === "th" ? category.nameTh : category.nameEn}
                  </p>
                  <p className="text-xl font-semibold">
                    {categoryCounts[category.key]}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {assets.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          {t("assets.empty")}
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
                      {asset.locationName ||
                        (locale === "th"
                          ? "ไม่ระบุสถานที่"
                          : "Location not specified")}
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
