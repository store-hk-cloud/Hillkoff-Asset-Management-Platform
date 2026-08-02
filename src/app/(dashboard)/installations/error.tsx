"use client";

import { RouteError } from "@/components/shared/route-error";

export default function InstallationsError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      context={{
        th: "กรุณาลองโหลดคิวงานติดตั้งอีกครั้ง",
        en: "Please try loading the installation queue again.",
      }}
      reset={reset}
    />
  );
}
