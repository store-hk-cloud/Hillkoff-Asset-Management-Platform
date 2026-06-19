import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleInstallationForm } from "@/features/installations/components/schedule-installation-form";
import { requireSession } from "@/lib/auth/dal";
import { InstallationManagementService } from "@/services/installation-management.service";

const service = new InstallationManagementService();

export const metadata = { title: "Schedule Installation" };

export default async function ScheduleInstallationPage() {
  const { profile } = await requireSession();
  if (!service.canSchedule(profile)) notFound();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/installations"
        >
          ← Installation Queue
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Schedule Installation
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Asset ต้องขายและผูกกับ Customer ID นี้แล้วก่อนสร้างนัดหมาย
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Installation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduleInstallationForm />
        </CardContent>
      </Card>
    </section>
  );
}
