"use client";

import { WifiOff } from "lucide-react";

import { usePwa } from "@/components/pwa/pwa-provider";

export function NetworkStatus() {
  const { isOnline } = usePwa();
  if (isOnline) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-sm font-medium text-white"
      role="status"
    >
      <WifiOff aria-hidden="true" className="size-4" />
      Offline — การบันทึกข้อมูลจะใช้งานไม่ได้
    </div>
  );
}
