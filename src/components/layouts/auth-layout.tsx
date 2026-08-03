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
    <div className="auth-shell bg-background min-h-dvh">
      <section className="auth-brand-panel relative overflow-hidden bg-[#03211f] p-10 text-white">
        <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-[#0aa39c]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 size-[28rem] rounded-full bg-[#00bac6]/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Image
            alt={t("app.name")}
            height={48}
            priority
            src="/icons/hillkoff-emblem.png"
            width={48}
          />
          <div>
            <p className="text-lg font-semibold tracking-tight">Hillkoff</p>
            <p className="text-xs text-white/55">Machine Management</p>
          </div>
        </div>
        <div className="relative max-w-xl space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-medium tracking-[0.18em] text-[#51ddd7] uppercase">
              Enterprise operations platform
            </p>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">
              {t("app.name")}
            </h1>
            <p className="max-w-lg text-base leading-7 text-white/65">
              {t("brand.tagline")}
            </p>
          </div>
          <div className="grid max-w-lg grid-cols-3 gap-3">
            <TrustPoint label={t("brand.pillar.highland")} />
            <TrustPoint label={t("brand.pillar.innovation")} />
            <TrustPoint label={t("brand.pillar.lives")} />
          </div>
        </div>
        <p className="relative text-xs text-white/45">
          Secure workspace · Role-based access · Audited operations
        </p>
      </section>

      <section className="flex min-h-dvh flex-col">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 sm:px-8 lg:border-0 lg:px-12 lg:pt-7">
          <div className="flex items-center gap-2 lg:hidden">
            <Image
              alt={t("app.name")}
              height={32}
              priority
              src="/icons/hillkoff-emblem.png"
              width={32}
            />
            <span className="text-sm font-semibold">Hillkoff</span>
          </div>
          <span className="hidden lg:block" />
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="grid flex-1 place-items-center px-4 py-10 sm:px-8 lg:px-12 lg:py-14">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <footer className="text-muted-foreground px-4 py-5 text-center text-xs sm:px-8 lg:px-12">
          {t("footer.rights")}
        </footer>
      </section>
    </div>
  );
}

function TrustPoint({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-3 text-xs text-white/75">
      {label}
    </div>
  );
}
