"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { LOCALE_COOKIE_NAME, type Locale } from "@/lib/i18n/config";
import { translate, type TranslationKey } from "@/lib/i18n/dictionaries";

interface LanguageContextValue {
  readonly locale: Locale;
  t(key: TranslationKey): string;
  setLocale(locale: Locale): void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      t: (key) => translate(locale, key),
      setLocale(nextLocale) {
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
        document.documentElement.lang = nextLocale;
        window.location.reload();
      },
    }),
    [locale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }
  return value;
}
