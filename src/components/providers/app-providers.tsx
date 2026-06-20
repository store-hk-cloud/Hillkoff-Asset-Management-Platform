"use client";

import type { ReactNode } from "react";

import { LanguageProvider } from "@/components/providers/language-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { NetworkStatus } from "@/components/pwa/network-status";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { AuthProvider } from "@/features/auth/providers/auth-provider";
import type { Locale } from "@/lib/i18n/config";

type AppProvidersProps = Readonly<{
  children: ReactNode;
  locale: Locale;
}>;

export function AppProviders({ children, locale }: AppProvidersProps) {
  return (
    <LanguageProvider locale={locale}>
      <ThemeProvider>
        <PwaProvider>
          <AuthProvider>{children}</AuthProvider>
          <NetworkStatus />
        </PwaProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
