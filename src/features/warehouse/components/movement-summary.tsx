"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { Card, CardContent } from "@/components/ui/card";
import type { Asset } from "@/domain/entities/asset";

type MovementSummaryProps = Readonly<{
  asset: Asset;
}>;

export function MovementSummary({ asset }: MovementSummaryProps) {
  const { locale } = useLanguage();

  return (
    <Card className="py-0">
      <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground text-xs">
            {locale === "th" ? "ทรัพย์สิน" : "Asset"}
          </p>
          <p className="font-semibold">{asset.name}</p>
          <p className="font-mono text-xs">{asset.assetCode}</p>
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            Serial: {asset.serialNumber ?? "—"}
          </p>
          {asset.color ? (
            <p className="text-muted-foreground text-xs">
              {locale === "th" ? "สี" : "Color"}: {asset.color}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-muted-foreground text-xs">
            {locale === "th" ? "ตำแหน่งปัจจุบัน" : "Current location"}
          </p>
          <p className="font-medium">
            {asset.locationName ||
              (locale === "th" ? "ไม่ระบุ" : "Not specified")}
          </p>
          <p className="text-muted-foreground text-xs">
            Warehouse: {asset.warehouseId ?? "—"} · Customer:{" "}
            {asset.customerId ?? "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
