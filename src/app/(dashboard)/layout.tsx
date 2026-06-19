import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { requireSession } from "@/lib/auth/dal";

type DashboardRouteLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function DashboardRouteLayout({
  children,
}: DashboardRouteLayoutProps) {
  const { profile } = await requireSession();

  return (
    <DashboardLayout displayName={profile.displayName} role={profile.role}>
      {children}
    </DashboardLayout>
  );
}
