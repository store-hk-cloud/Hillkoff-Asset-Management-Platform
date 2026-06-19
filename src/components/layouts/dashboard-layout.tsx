import type { ReactNode } from "react";
import Link from "next/link";

import { LogoutButton } from "@/features/auth/components/logout-button";

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
  displayName: string;
  role: string;
}>;

export function DashboardLayout({
  children,
  displayName,
  role,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-dvh">
      <header className="bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <Link className="text-sm font-semibold" href="/dashboard">
              Hillkoff Asset Management
            </Link>
            <nav className="hidden items-center gap-4 text-sm sm:flex">
              <Link
                className="text-muted-foreground hover:text-foreground"
                href="/assets"
              >
                Assets
              </Link>
              <Link
                className="text-muted-foreground hover:text-foreground"
                href="/warehouse"
              >
                Warehouse
              </Link>
              <Link
                className="text-muted-foreground hover:text-foreground"
                href="/installations"
              >
                Installations
              </Link>
              <Link
                className="text-muted-foreground hover:text-foreground"
                href="/repairs"
              >
                Repairs
              </Link>
              <Link
                className="text-muted-foreground hover:text-foreground"
                href="/pm"
              >
                PM
              </Link>
              <Link
                className="text-muted-foreground hover:text-foreground"
                href="/inventory"
              >
                Inventory
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
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
          <MobileLink href="/dashboard">Dashboard</MobileLink>
          <MobileLink href="/assets">Assets</MobileLink>
          <MobileLink href="/warehouse">Warehouse</MobileLink>
          <MobileLink href="/installations">Installations</MobileLink>
          <MobileLink href="/repairs">Repairs</MobileLink>
          <MobileLink href="/pm">PM</MobileLink>
          <MobileLink href="/inventory">Inventory</MobileLink>
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
