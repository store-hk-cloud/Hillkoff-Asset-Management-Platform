"use client";

import { RouteError } from "@/components/shared/route-error";

export default function WarehouseError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      context={{
        th: "กรุณาลองโหลดข้อมูลคลังสินค้าอีกครั้ง",
        en: "Please try loading the warehouse data again.",
      }}
      reset={reset}
    />
  );
}
