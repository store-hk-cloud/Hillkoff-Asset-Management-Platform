"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import type { AssetCondition, AssetStatus } from "@/domain/entities/asset";

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
  const tone =
    value === "active" || value === "operational"
      ? "success"
      : value === "needs_repair"
        ? "warning"
        : "neutral";

  return <StatusBadge tone={tone}>{labels[value] ?? value}</StatusBadge>;
}
