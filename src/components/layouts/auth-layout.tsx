import Image from "next/image";
import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { getServerTranslator } from "@/lib/i18n/server";

type AuthLayoutProps = Readonly<{
  children: ReactNode;
}>;

export async function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = await getServerTranslator();

  return (
    <div className="min-h-dvh">
      <header className="flex min-h-14 items-center justify-end gap-1 px-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>
      <main className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-4 pb-14">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Image
              alt={t("app.name")}
              height={56}
              priority
              src="/icons/hillkoff-emblem.png"
              width={56}
            />
            <p className="text-muted-foreground text-sm">
              {t("brand.tagline")}
            </p>
            <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
              <span>{t("brand.pillar.highland")}</span>
              <span aria-hidden="true">·</span>
              <span>{t("brand.pillar.innovation")}</span>
              <span aria-hidden="true">·</span>
              <span>{t("brand.pillar.lives")}</span>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
