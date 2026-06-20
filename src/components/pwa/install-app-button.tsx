"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePwa } from "@/components/pwa/pwa-provider";
import { useLanguage } from "@/components/providers/language-provider";

export function InstallAppButton() {
  const { locale, t } = useLanguage();
  const { canInstall, install, isIos } = usePwa();
  const [message, setMessage] = useState<string | null>(null);

  if (!canInstall) return null;

  async function handleInstall() {
    const result = await install();
    if (result === "ios") {
      setMessage(
        locale === "th"
          ? "บน iPhone/iPad ให้กด Share แล้วเลือก Add to Home Screen"
          : "On iPhone/iPad, tap Share and choose Add to Home Screen.",
      );
    } else if (result === "dismissed") {
      setMessage(
        locale === "th"
          ? "ยกเลิกการติดตั้งแล้ว สามารถติดตั้งภายหลังได้"
          : "Installation was dismissed. You can install the app later.",
      );
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        className="h-9"
        onClick={handleInstall}
        type="button"
        variant="outline"
      >
        <Download aria-hidden="true" className="size-4" />
        {isIos
          ? locale === "th"
            ? "วิธีติดตั้ง"
            : "How to install"
          : t("action.install")}
      </Button>
      {message ? (
        <p className="text-muted-foreground max-w-64 text-right text-xs">
          {message}
        </p>
      ) : null}
    </div>
  );
}
