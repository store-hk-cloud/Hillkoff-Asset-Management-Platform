import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

type StatusBadgeProps = Readonly<{
  tone?: StatusBadgeTone;
  className?: string;
  children: ReactNode;
}>;

export function StatusBadge({
  tone = "neutral",
  className,
  children,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "status-badge",
        tone === "success" && "is-success",
        tone === "warning" && "is-warning",
        tone === "danger" && "is-danger",
        tone === "info" && "is-info",
        className,
      )}
    >
      {children}
    </span>
  );
}
