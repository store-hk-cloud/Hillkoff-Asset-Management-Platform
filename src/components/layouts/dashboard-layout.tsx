"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  Boxes,
  CalendarCog,
  ChevronRight,
  ClipboardList,
  HardHat,
  CircleHelp,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Users,
  Warehouse,
  X,
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
import type { Locale } from "@/lib/i18n/config";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

type NavigationGroup = "workspace" | "operations" | "system";

type NavigationItem = {
  href: string;
  labelKey: TranslationKey;
  roles: readonly UserRole[];
  icon: LucideIcon;
  group: NavigationGroup;
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
    group: "workspace",
    guideId: "dashboard-overview",
  },
  {
    href: "/assets",
    labelKey: "nav.assets",
    roles: allRoles,
    icon: Boxes,
    group: "workspace",
    guideId: "machines-and-identity",
  },
  {
    href: "/technician",
    labelKey: "nav.technician",
    roles: ["technician"],
    icon: HardHat,
    group: "workspace",
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
    group: "workspace",
    guideId: "service-lifecycle",
  },
  {
    href: "/warehouse",
    labelKey: "nav.warehouse",
    roles: ["admin", "warehouse", "sales", "branch", "executive"],
    icon: Warehouse,
    group: "operations",
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
    group: "operations",
    guideId: "preventive-maintenance",
  },
  {
    href: "/inventory",
    labelKey: "nav.inventory",
    roles: ["admin", "warehouse", "technician", "executive"],
    icon: PackageCheck,
    group: "operations",
    guideId: "inventory-control",
  },
  {
    href: "/notifications",
    labelKey: "nav.notifications",
    roles: ["admin", "technician", "executive"],
    icon: Bell,
    group: "system",
    guideId: "notifications-and-dashboard",
  },
  {
    href: "/users",
    labelKey: "nav.users",
    roles: ["admin"],
    icon: Users,
    group: "system",
    guideId: "users-and-access",
  },
  {
    href: "/help",
    labelKey: "nav.help",
    roles: allRoles,
    icon: CircleHelp,
    group: "system",
    guideId: "start-here",
  },
];

const groupKeys: readonly NavigationGroup[] = [
  "workspace",
  "operations",
  "system",
];

export function DashboardLayout({
  children,
  displayName,
  role,
}: DashboardLayoutProps) {
  const { locale, t } = useLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(role),
  );

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  const currentItem = [...visibleNavigation]
    .sort((left, right) => right.href.length - left.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );

  return (
    <div className="bg-background text-foreground min-h-dvh">
      {mobileOpen ? (
        <button
          aria-label={locale === "th" ? "ปิดเมนูนำทาง" : "Close navigation"}
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        id="primary-navigation"
        aria-label="Primary navigation"
        className={cn(
          "bg-card fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r px-4 py-5 shadow-xl transition-transform duration-200 lg:translate-x-0",
          mobileOpen && "translate-x-0",
        )}
      >
        <div className="relative -mx-4 -mt-5 mb-6 overflow-hidden px-4 py-5">
          <Image
            alt=""
            className="object-cover"
            fill
            priority
            src="/images/hillkoff-highland.jpg"
          />
          <div className="pointer-events-none absolute inset-0 bg-[var(--brand-panel)]/80" />
          <div className="relative flex items-center justify-between">
            <Link
              className="focus-visible:ring-ring flex min-w-0 items-center gap-3 rounded-lg text-white outline-none focus-visible:ring-2"
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
            >
              <Image
                alt={t("app.name")}
                className="size-10 shrink-0"
                height={40}
                priority
                src="/icons/hillkoff-emblem.png"
                width={40}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-tight">
                  Hillkoff
                </span>
                <span className="block truncate text-[11px] text-white/60">
                  Machine Management
                </span>
              </span>
            </Link>
            <Button
              aria-label={locale === "th" ? "ปิดเมนูนำทาง" : "Close navigation"}
              className="text-white hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(false)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>

        <nav
          className="min-h-0 flex-1 space-y-6 overflow-y-auto"
          aria-label="Application navigation"
        >
          {groupKeys.map((group) => {
            const items = visibleNavigation.filter(
              (item) => item.group === group,
            );
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="text-muted-foreground mb-2 px-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
                  {t(`nav.${group}` as TranslationKey)}
                </p>
                <div className="space-y-1">
                  {items.map((item) => (
                    <NavigationLink
                      active={
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`)
                      }
                      icon={item.icon}
                      key={item.href}
                      label={t(item.labelKey)}
                      guideId={item.guideId}
                      locale={locale}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mt-5 border-t pt-4">
          <Link
            className="bg-muted/60 hover:bg-accent focus-visible:ring-ring flex items-center gap-3 rounded-lg p-3 transition-colors outline-none focus-visible:ring-2"
            href="/profile"
            onClick={() => setMobileOpen(false)}
          >
            <span className="bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {initials(displayName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {displayName}
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                {role}
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="text-muted-foreground size-4"
            />
          </Link>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="bg-background/90 sticky top-0 z-20 border-b backdrop-blur">
          <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                aria-controls="primary-navigation"
                aria-expanded={mobileOpen}
                aria-label={
                  locale === "th" ? "เปิดเมนูนำทาง" : "Open navigation"
                }
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Menu aria-hidden="true" className="size-5" />
              </Button>
              <div className="min-w-0">
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <span className="hidden sm:inline">Hillkoff</span>
                  <ChevronRight
                    aria-hidden="true"
                    className="hidden size-3 sm:inline"
                  />
                  <span className="truncate">
                    {currentItem ? t(currentItem.labelKey) : t("app.name")}
                  </span>
                </div>
                <p className="text-foreground truncate text-sm font-medium sm:text-base">
                  {currentItem ? t(currentItem.labelKey) : t("app.name")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Button
                aria-label={t("nav.help")}
                asChild
                size="icon"
                variant="ghost"
              >
                <Link href="/help">
                  <CircleHelp aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <InstallAppButton />
              <LanguageSwitcher />
              <ThemeToggle />
              <span className="bg-border mx-1 hidden h-6 w-px sm:block" />
              <Link
                aria-label={`${displayName} profile`}
                className="hover:bg-accent focus-visible:ring-ring hidden items-center gap-2 rounded-lg px-2 py-1.5 outline-none focus-visible:ring-2 sm:flex"
                href="/profile"
              >
                <span className="bg-primary/12 text-primary flex size-8 items-center justify-center rounded-full text-[11px] font-semibold">
                  {initials(displayName)}
                </span>
                <span className="max-w-32 truncate text-xs font-medium">
                  {displayName}
                </span>
              </Link>
              <LogoutButton />
            </div>
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
    </div>
  );
}

function NavigationLink({
  active,
  guideId,
  href,
  icon: Icon,
  label,
  locale,
  onClick,
}: {
  active: boolean;
  href: string;
  icon: LucideIcon;
  guideId: HelpGuideId;
  label: string;
  locale: Locale;
  onClick(): void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Link
        aria-current={active ? "page" : undefined}
        className={cn(
          "group focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        href={href}
        onClick={onClick}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "size-[18px]",
            active
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        <span className="flex-1 truncate">{label}</span>
        {active ? (
          <span
            aria-hidden="true"
            className="bg-primary size-1.5 rounded-full"
          />
        ) : null}
      </Link>
      <Link
        aria-label={locale === "th" ? `คู่มือ ${label}` : `${label} user guide`}
        className="text-muted-foreground hover:bg-accent hover:text-primary focus-visible:ring-ring flex size-9 shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2"
        href={`/help/${guideId}`}
        onClick={onClick}
        title={locale === "th" ? `คู่มือ ${label}` : `${label} user guide`}
      >
        <BookOpen aria-hidden="true" className="size-4" />
      </Link>
    </div>
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
