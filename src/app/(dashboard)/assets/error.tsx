"use client";

import { RouteError } from "@/components/shared/route-error";

export default function AssetsError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      context={{
        th: "กรุณาลองโหลดรายการเครื่องอีกครั้ง",
        en: "Please try loading the machine list again.",
      }}
      reset={reset}
    />
  );
}
