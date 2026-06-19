import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PmError } from "@/domain/errors/pm.error";
import { PmCompletionForm } from "@/features/pm/components/pm-completion-form";
import { requireSession } from "@/lib/auth/dal";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();
const formatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

type Props = { params: Promise<{ pmId: string }> };

export default async function PmDetailPage({ params }: Props) {
  const { profile } = await requireSession();
  const { pmId } = await params;
  let job;
  try {
    job = await service.get(pmId, profile);
  } catch (error) {
    if (
      error instanceof PmError &&
      (error.code === "PM_NOT_FOUND" || error.code === "PM_ACCESS_DENIED")
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/pm"
        >
          ← Preventive Maintenance
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {job.title}
          </h1>
          <span className="bg-muted rounded-full px-2 py-1 text-xs font-medium">
            {job.status}
          </span>
        </div>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          {job.jobNumber}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PM Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Detail label="Asset" value={`${job.assetCode} · ${job.assetName}`} />
          <Detail label="Scheduled" value={formatter.format(job.scheduledAt)} />
          <Detail label="Technician" value={job.assignedTechnicianName} />
          <Detail
            label="Recurrence"
            value={
              job.recurrenceMonths ? `ทุก ${job.recurrenceMonths} เดือน` : "—"
            }
          />
          {job.completedAt ? (
            <Detail
              label="Completed"
              value={formatter.format(job.completedAt)}
            />
          ) : null}
          {job.nextDueAt ? (
            <Detail label="Next Due" value={formatter.format(job.nextDueAt)} />
          ) : null}
        </CardContent>
      </Card>

      {job.status === "scheduled" && service.canComplete(profile, job) ? (
        <Card>
          <CardHeader>
            <CardTitle>PM Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <PmCompletionForm
              initialChecklist={job.checklist}
              pmId={job.id}
              version={job.version}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>PM Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {job.checklist.map((item) => (
              <div className="rounded-md border p-3" key={item.id}>
                <p className="font-medium">
                  {item.completed ? "✓ " : ""}
                  {item.label}
                </p>
                {item.notes ? (
                  <p className="text-muted-foreground mt-1">{item.notes}</p>
                ) : null}
              </div>
            ))}
            {job.completionNotes ? (
              <div className="border-t pt-4">
                <Detail label="Completion Notes" value={job.completionNotes} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 font-medium whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
