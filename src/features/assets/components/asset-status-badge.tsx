"use client";

import { useLanguage } from "@/components/providers/language-provider";
import type { AssetCondition, AssetStatus } from "@/domain/entities/asset";
import { cn } from "@/lib/utils";

type AssetStatusBadgeProps = Readonly<{
  status?: AssetStatus;
  condition?: AssetCondition;
}>;

export function AssetStatusBadge({ status, condition }: AssetStatusBadgeProps) {
  const { locale } = useLanguage();
  const value = status ?? condition ?? "";
  const labels: Record<string, string> =
    locale === "th"
      ? {
          active: "ใช้งานอยู่",
          archived: "เก็บถาวร",
          operational: "พร้อมใช้งาน",
          needs_repair: "ต้องซ่อม",
          out_of_service: "หยุดใช้งาน",
        }
      : {
          active: "Active",
          archived: "Archived",
          operational: "Operational",
          needs_repair: "Needs repair",
          out_of_service: "Out of service",
        };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        value === "active" || value === "operational"
          ? "bg-green-100 text-green-800"
          : value === "needs_repair"
            ? "bg-amber-100 text-amber-800"
            : "bg-neutral-100 text-neutral-700",
      )}
    >
      {labels[value] ?? value}
    </span>
  );
}
