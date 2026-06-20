"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";

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
          ? "rounded-lg border bg-green-50 p-3 text-sm text-green-800"
          : "rounded-lg border bg-amber-50 p-3 text-sm text-amber-900"
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
            ? locale === "th"
              ? "ออนไลน์ พร้อมซิงก์ข้อมูล"
              : "Online and ready to sync"
            : locale === "th"
              ? "ออฟไลน์ ระบบจะเก็บแบบร่างไว้ในเครื่อง"
              : "Offline; drafts are stored on this device"}
        </span>
      </div>
      {pendingFiles > 0 ? (
        <p className="mt-1 text-xs">
          {locale === "th"
            ? `มีรูปภาพรออัปโหลด ${pendingFiles} รูป`
            : `${pendingFiles} photos waiting to upload`}
        </p>
      ) : null}
    </div>
  );
}
