"use client";

import { RouteError } from "@/components/shared/route-error";

export default function RepairsError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      context={{
        th: "กรุณาลองโหลดรายการงานซ่อมอีกครั้ง",
        en: "Please try loading the repair list again.",
      }}
      reset={reset}
    />
  );
}
