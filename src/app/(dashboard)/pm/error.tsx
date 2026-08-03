"use client";

import { RouteError } from "@/components/shared/route-error";

export default function PreventiveMaintenanceError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <RouteError
      context={{
        th: "กรุณาลองโหลดรายการ PM อีกครั้ง",
        en: "กรุณาลองโหลดรายการ PM อีกครั้ง / Please try loading the preventive maintenance list again.",
      }}
      reset={reset}
    />
  );
}
