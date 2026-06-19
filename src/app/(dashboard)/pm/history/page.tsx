import Link from "next/link";
import { History } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/dal";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();
const formatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export default async function PmHistoryPage() {
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();
  const jobs = await service.list(profile, { status: "completed" });

  return (
    <section className="space-y-6">
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/pm"
        >
          ← Preventive Maintenance
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          PM History
        </h1>
      </div>
      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <History
            aria-hidden="true"
            className="text-muted-foreground mx-auto mb-3 size-8"
          />
          <p className="text-muted-foreground text-sm">ยังไม่มีประวัติ PM</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Link href={`/pm/${job.id}`} key={job.id}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">{job.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    {job.assetCode} · {job.assetName}
                  </p>
                  <p className="text-muted-foreground">
                    Completed{" "}
                    {job.completedAt ? formatter.format(job.completedAt) : "—"}
                  </p>
                  <p className="text-muted-foreground">
                    Next due{" "}
                    {job.nextDueAt ? formatter.format(job.nextDueAt) : "—"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
