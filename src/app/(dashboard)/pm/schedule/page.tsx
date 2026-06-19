import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchedulePmForm } from "@/features/pm/components/schedule-pm-form";
import { requireSession } from "@/lib/auth/dal";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();

export const metadata = { title: "PM Schedule" };

export default async function PmSchedulePage() {
  const { profile } = await requireSession();
  if (!service.canSchedule(profile)) notFound();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/pm"
        >
          ← Preventive Maintenance
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          PM Schedule
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Schedule Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SchedulePmForm />
        </CardContent>
      </Card>
    </section>
  );
}
