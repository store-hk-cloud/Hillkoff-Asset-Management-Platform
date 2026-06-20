"use client";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const nextLocale = locale === "th" ? "en" : "th";
  const nextLocaleKey = nextLocale === "th" ? "language.th" : "language.en";

  return (
    <Button
      aria-label={`${t("action.language")}: ${t(nextLocaleKey)}`}
      onClick={() => setLocale(nextLocale)}
      size="sm"
      title={`${t("action.language")}: ${t(nextLocaleKey)}`}
      type="button"
      variant="ghost"
    >
      <Languages aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">{nextLocale.toUpperCase()}</span>
    </Button>
  );
}
