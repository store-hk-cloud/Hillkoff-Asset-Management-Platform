import { Card, CardContent } from "@/components/ui/card";
import type { Asset } from "@/domain/entities/asset";

type MovementSummaryProps = Readonly<{
  asset: Asset;
}>;

export function MovementSummary({ asset }: MovementSummaryProps) {
  return (
    <Card className="py-0">
      <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground text-xs">ทรัพย์สิน</p>
          <p className="font-semibold">{asset.name}</p>
          <p className="font-mono text-xs">{asset.assetCode}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">ตำแหน่งปัจจุบัน</p>
          <p className="font-medium">{asset.locationName || "ไม่ระบุ"}</p>
          <p className="text-muted-foreground text-xs">
            Branch: {asset.branchId ?? "—"} · Customer:{" "}
            {asset.customerId ?? "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
