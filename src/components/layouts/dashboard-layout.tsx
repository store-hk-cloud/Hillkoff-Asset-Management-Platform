import type { ReactNode } from "react";
import Link from "next/link";

import { InstallAppButton } from "@/components/pwa/install-app-button";
import type { UserRole } from "@/domain/value-objects/user-role";
import { LogoutButton } from "@/features/auth/components/logout-button";

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
  displayName: string;
  role: UserRole;
}>;

const navigation: readonly {
  href: string;
  label: string;
  roles: readonly UserRole[];
}[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
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
    label: "Assets",
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
    label: "Warehouse",
    roles: ["admin", "warehouse", "sales", "branch", "executive"],
  },
  {
    href: "/installations",
    label: "Installations",
    roles: ["admin", "technician", "sales", "customer", "executive"],
  },
  {
    href: "/repairs",
    label: "Repairs",
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
    label: "PM",
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
    label: "Inventory",
    roles: ["admin", "warehouse", "technician", "executive"],
  },
  {
    href: "/notifications",
    label: "Notifications",
    roles: ["admin", "executive"],
  },
  {
    href: "/users",
    label: "Users",
    roles: ["admin"],
  },
];

export function DashboardLayout({
  children,
  displayName,
  role,
}: DashboardLayoutProps) {
  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(role),
  );

  return (
    <div className="min-h-dvh">
      <header className="bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <Link className="text-sm font-semibold" href="/dashboard">
              Hillkoff Asset Management
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
                    {item.label}
                  </Link>
                ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <InstallAppButton />
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
          aria-label="Mobile navigation"
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto border-t px-4 sm:hidden"
        >
          {visibleNavigation.map((item) => (
            <MobileLink href={item.href} key={item.href}>
              {item.label}
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
