"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { useLanguage } from "@/components/providers/language-provider";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import type { UserRole } from "@/domain/value-objects/user-role";
import { LogoutButton } from "@/features/auth/components/logout-button";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
  displayName: string;
  role: UserRole;
}>;

const navigation: readonly {
  href: string;
  labelKey: TranslationKey;
  roles: readonly UserRole[];
}[] = [
  {
    href: "/dashboard",
    labelKey: "nav.dashboard",
    roles: [
      "admin",
      "warehouse",
      "technician",
      "sales",
      "branch",
      "customer",
      "executive",
    ],
  },
  {
    href: "/assets",
    labelKey: "nav.assets",
    roles: [
      "admin",
      "warehouse",
      "technician",
      "sales",
      "branch",
      "customer",
      "executive",
    ],
  },
  {
    href: "/warehouse",
    labelKey: "nav.warehouse",
    roles: ["admin", "warehouse", "sales", "branch", "executive"],
  },
  {
    href: "/installations",
    labelKey: "nav.installations",
    roles: ["admin", "technician", "sales", "customer", "executive"],
  },
  {
    href: "/repairs",
    labelKey: "nav.repairs",
    roles: [
      "admin",
      "warehouse",
      "technician",
      "sales",
      "branch",
      "customer",
      "executive",
    ],
  },
  {
    href: "/pm",
    labelKey: "nav.pm",
    roles: [
      "admin",
      "warehouse",
      "technician",
      "branch",
      "customer",
      "executive",
    ],
  },
  {
    href: "/inventory",
    labelKey: "nav.inventory",
    roles: ["admin", "warehouse", "technician", "executive"],
  },
  {
    href: "/notifications",
    labelKey: "nav.notifications",
    roles: ["admin", "executive"],
  },
  {
    href: "/users",
    labelKey: "nav.users",
    roles: ["admin"],
  },
];

export function DashboardLayout({
  children,
  displayName,
  role,
}: DashboardLayoutProps) {
  const { t } = useLanguage();
  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(role),
  );

  return (
    <div className="min-h-dvh">
      <header className="bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <Link className="text-sm font-semibold" href="/dashboard">
              {t("app.name")}
            </Link>
            <nav className="hidden items-center gap-4 text-sm sm:flex">
              {visibleNavigation
                .filter((item) => item.href !== "/dashboard")
                .map((item) => (
                  <Link
                    className="text-muted-foreground hover:text-foreground"
                    href={item.href}
                    key={item.href}
                  >
                    {t(item.labelKey)}
                  </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <InstallAppButton />
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              className="hidden text-right text-xs sm:block"
              href="/profile"
            >
              <span className="block font-medium">{displayName}</span>
              <span className="text-muted-foreground">{role}</span>
            </Link>
            <LogoutButton />
          </div>
        </div>
        <nav
          aria-label={t("nav.mobile")}
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto border-t px-4 sm:hidden"
        >
          {visibleNavigation.map((item) => (
            <MobileLink href={item.href} key={item.href}>
              {t(item.labelKey)}
            </MobileLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

function MobileLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link
      className="text-muted-foreground hover:text-foreground shrink-0 px-3 py-2.5 text-xs font-medium"
      href={href}
    >
      {children}
    </Link>
  );
}
