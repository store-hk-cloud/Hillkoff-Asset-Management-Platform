"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { thaiPrimary } from "@/lib/i18n/thai-primary";

export function OfflineWorkStatus({
  pendingFiles = 0,
}: {
  pendingFiles?: number;
}) {
  const { locale } = useLanguage();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <div
      className={
        online
          ? "text-success rounded-lg border bg-[var(--success-bg)] p-3 text-sm"
          : "text-warning rounded-lg border bg-[var(--warning-bg)] p-3 text-sm"
      }
    >
      <div className="flex items-center gap-2">
        {online ? (
          <Cloud className="size-4" />
        ) : (
          <CloudOff className="size-4" />
        )}
        <span>
          {online
            ? thaiPrimary(
                locale,
                "ออนไลน์ พร้อมซิงก์ข้อมูล",
                "Online and ready to sync",
              )
            : thaiPrimary(
                locale,
                "ออฟไลน์ ระบบจะเก็บแบบร่างไว้ในเครื่อง",
                "Offline; drafts are stored on this device",
              )}
        </span>
      </div>
      {pendingFiles > 0 ? (
        <p className="mt-1 text-xs">
          {thaiPrimary(
            locale,
            `มีรูปภาพรออัปโหลด ${pendingFiles} รูป`,
            `${pendingFiles} photos waiting to upload`,
          )}
        </p>
      ) : null}
    </div>
  );
}
