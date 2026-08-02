"use client";

import { RouteError } from "@/components/shared/route-error";

export default function InventoryError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      context={{
        th: "กรุณาลองโหลดคลังอะไหล่อีกครั้ง",
        en: "Please try loading the inventory again.",
      }}
      reset={reset}
    />
  );
}
