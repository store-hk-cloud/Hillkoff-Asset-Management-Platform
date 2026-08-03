"use client";

import { RouteError } from "@/components/shared/route-error";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      context={{
        th: "กรุณาลองโหลดข้อมูลภาพรวมอีกครั้ง หากยังพบปัญหาให้แจ้งรหัสติดตามกับผู้ดูแลระบบ",
        en: "Please try loading the dashboard again. If the problem continues, share the request details with an administrator.",
      }}
      reset={reset}
    />
  );
}
