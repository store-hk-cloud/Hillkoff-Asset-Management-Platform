"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Bell,
  Boxes,
  CalendarCog,
  ChevronRight,
  ClipboardList,
  HardHat,
  CircleHelp,
  LayoutDashboard,
  PackageCheck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/domain/value-objects/user-role";
import { LogoutButton } from "@/features/auth/components/logout-button";
import type { HelpGuideId } from "@/features/help/help-content";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  labelKey: TranslationKey;
  roles: readonly UserRole[];
  icon: LucideIcon;
  guideId: HelpGuideId;
};

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
  displayName: string;
  role: UserRole;
}>;

const allRoles: readonly UserRole[] = [
  "admin",
  "warehouse",
  "technician",
  "sales",
  "branch",
  "customer",
  "executive",
];

const navigation: readonly NavigationItem[] = [
  {
    href: "/dashboard",
    labelKey: "nav.dashboard",
    roles: allRoles,
    icon: LayoutDashboard,
    guideId: "dashboard-overview",
  },
  {
    href: "/assets",
    labelKey: "nav.assets",
    roles: allRoles,
    icon: Boxes,
    guideId: "machines-and-identity",
  },
  {
    href: "/technician",
    labelKey: "nav.technician",
    roles: ["technician"],
    icon: HardHat,
    guideId: "technician-daily-work",
  },
  {
    href: "/service-jobs",
    labelKey: "nav.serviceJobs",
    roles: [
      "admin",
      "warehouse",
      "technician",
      "sales",
      "branch",
      "customer",
      "executive",
    ],
    icon: ClipboardList,
    guideId: "service-lifecycle",
  },
  {
    href: "/warehouse",
    labelKey: "nav.warehouse",
    roles: ["admin", "warehouse", "sales", "branch", "executive"],
    icon: Warehouse,
    guideId: "warehouse-and-inventory",
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
    icon: CalendarCog,
    guideId: "preventive-maintenance",
  },
  {
    href: "/inventory",
    labelKey: "nav.inventory",
    roles: ["admin", "warehouse", "technician", "executive"],
    icon: PackageCheck,
    guideId: "inventory-control",
  },
  {
    href: "/notifications",
    labelKey: "nav.notifications",
    roles: ["admin", "technician", "executive"],
    icon: Bell,
    guideId: "notifications-and-dashboard",
  },
  {
    href: "/users",
    labelKey: "nav.users",
    roles: ["admin"],
    icon: Users,
    guideId: "users-and-access",
  },
  {
    href: "/help",
    labelKey: "nav.help",
    roles: allRoles,
    icon: CircleHelp,
    guideId: "start-here",
  },
];

export function DashboardLayout({
  children,
  displayName,
  role,
}: DashboardLayoutProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(role),
  );

  const currentItem = [...visibleNavigation]
    .sort((left, right) => right.href.length - left.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <header className="sticky top-0 z-20 bg-[var(--brand-panel)] text-white">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-4">
            <Link
              className="focus-visible:ring-ring flex min-w-0 items-center gap-3 outline-none focus-visible:ring-2"
              href="/dashboard"
            >
              <Image
                alt={t("app.name")}
                className="size-9 shrink-0"
                height={36}
                priority
                src="/icons/hillkoff-emblem.png"
                width={36}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-tight">
                  Hillkoff
                </span>
                <span className="block truncate text-[11px] text-white/60">
                  {currentItem ? t(currentItem.labelKey) : t("app.name")}
                </span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Button
                aria-label={t("nav.help")}
                asChild
                className="text-white hover:bg-white/10 hover:text-white"
                size="icon"
                variant="ghost"
              >
                <Link href="/help">
                  <CircleHelp aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <InstallAppButton className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" />
              <LanguageSwitcher />
              <ThemeToggle />
              <span className="mx-1 hidden h-6 w-px bg-white/15 sm:block" />
              <Link
                aria-label={`${displayName} profile`}
                className="hidden items-center gap-2 rounded-lg px-2 py-1.5 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 sm:flex"
                href="/profile"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-white/12 text-[11px] font-semibold">
                  {initials(displayName)}
                </span>
                <span className="max-w-32 truncate text-xs font-medium">
                  {displayName}
                </span>
              </Link>
              <LogoutButton />
            </div>
          </div>

          <nav
            aria-label="Application navigation"
            className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-3"
          >
            {visibleNavigation.map((item) => (
              <NavigationLink
                active={
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)
                }
                icon={item.icon}
                key={item.href}
                label={t(item.labelKey)}
                href={item.href}
              />
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100dvh-9rem)] max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        {children}
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs sm:flex-row sm:px-6 lg:px-8">
          <span>
            © {new Date().getFullYear()} {t("footer.rights")}
          </span>
          <Link className="hover:text-foreground" href="/terms">
            {t("footer.terms")}
          </Link>
        </div>
      </footer>
    </div>
  );
}

function NavigationLink({
  active,
  href,
  icon: Icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40",
        active
          ? "bg-white/12 text-white"
          : "text-white/65 hover:bg-white/8 hover:text-white",
      )}
      href={href}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {label}
      {active ? (
        <ChevronRight aria-hidden="true" className="hidden size-3 sm:block" />
      ) : null}
    </Link>
  );
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "HK"
  );
}
