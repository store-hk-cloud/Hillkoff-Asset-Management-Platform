"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bell,
  Boxes,
  CalendarCog,
  ChevronRight,
  ClipboardList,
  HardHat,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Users,
  Warehouse,
  Wrench,
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
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

type NavigationGroup = "workspace" | "operations" | "system";

type NavigationItem = {
  href: string;
  labelKey: TranslationKey;
  roles: readonly UserRole[];
  icon: LucideIcon;
  group: NavigationGroup;
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
  },
  {
    href: "/assets",
    labelKey: "nav.assets",
    roles: allRoles,
    icon: Boxes,
    group: "workspace",
  },
  {
    href: "/technician",
    labelKey: "nav.technician",
    roles: ["technician"],
    icon: HardHat,
    group: "workspace",
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
  },
  {
    href: "/warehouse",
    labelKey: "nav.warehouse",
    roles: ["admin", "warehouse", "sales", "branch", "executive"],
    icon: Warehouse,
    group: "operations",
  },
  {
    href: "/installations",
    labelKey: "nav.installations",
    roles: ["admin", "technician", "sales", "customer", "executive"],
    icon: PackageCheck,
    group: "operations",
  },
  {
    href: "/repairs",
    labelKey: "nav.repairs",
    roles: allRoles,
    icon: Wrench,
    group: "operations",
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
  },
  {
    href: "/inventory",
    labelKey: "nav.inventory",
    roles: ["admin", "warehouse", "technician", "executive"],
    icon: PackageCheck,
    group: "operations",
  },
  {
    href: "/notifications",
    labelKey: "nav.notifications",
    roles: ["admin", "technician", "executive"],
    icon: Bell,
    group: "system",
  },
  {
    href: "/users",
    labelKey: "nav.users",
    roles: ["admin"],
    icon: Users,
    group: "system",
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
  const { t } = useLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(role),
  );
  const currentItem =
    [...visibleNavigation]
      .sort((left, right) => right.href.length - left.href.length)
      .find(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      ) ?? visibleNavigation[0];

  return (
    <div className="bg-background text-foreground min-h-dvh">
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        aria-label="Primary navigation"
        className={cn(
          "bg-card fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r px-4 py-5 shadow-xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none",
          mobileOpen && "translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <Link
            className="focus-visible:ring-ring flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2"
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
              <span className="text-muted-foreground block truncate text-[11px]">
                Machine Management
              </span>
            </span>
          </Link>
          <Button
            aria-label="Close navigation"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="my-6 border-t" />

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
                aria-label="Open navigation"
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
                    {currentItem ? t(currentItem.labelKey) : t("nav.dashboard")}
                  </span>
                </div>
                <p className="text-foreground truncate text-sm font-medium sm:text-base">
                  {currentItem ? t(currentItem.labelKey) : t("nav.dashboard")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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
  href,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  onClick(): void;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "group focus-visible:ring-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
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
        <span aria-hidden="true" className="bg-primary size-1.5 rounded-full" />
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
