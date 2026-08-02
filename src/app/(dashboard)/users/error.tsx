"use client";

import { RouteError } from "@/components/shared/route-error";

export default function UsersError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      context={{
        th: "กรุณาลองโหลดรายการผู้ใช้งานอีกครั้ง",
        en: "Please try loading the users list again.",
      }}
      reset={reset}
    />
  );
}
