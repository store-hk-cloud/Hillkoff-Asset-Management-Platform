import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { PmError } from "@/domain/errors/pm.error";
import { PmCompletionForm } from "@/features/pm/components/pm-completion-form";
import { TechnicianAssignmentForm } from "@/features/technician/components/technician-assignment-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { thaiPrimary } from "@/lib/i18n/thai-primary";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();
type Props = { params: Promise<{ pmId: string }> };

export default async function PmDetailPage({ params }: Props) {
  const { locale } = await getServerTranslator();
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
  const formatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    },
  );

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/pm"
        >
          ← {thaiPrimary(locale, "งานบำรุงรักษา PM", "Preventive maintenance")}
        </Link>
        <PageHeader
          description={<span className="font-mono">{job.jobNumber}</span>}
          eyebrow={thaiPrimary(
            locale,
            "งานบำรุงรักษา PM",
            "Preventive maintenance",
          )}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {job.title}
              <span className="bg-muted rounded-full px-2 py-1 text-xs font-medium">
                {job.status}
              </span>
            </span>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {thaiPrimary(locale, "รายละเอียด PM", "PM details")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Detail
            label={thaiPrimary(locale, "เครื่อง", "Asset")}
            value={`${job.assetCode} · ${job.assetName}`}
          />
          <Detail
            label={thaiPrimary(locale, "กำหนดวัน", "Scheduled")}
            value={formatter.format(job.scheduledAt)}
          />
          <Detail
            label={thaiPrimary(locale, "ช่างผู้รับผิดชอบ", "Technician")}
            value={job.assignedTechnicianName}
          />
          <Detail
            label={thaiPrimary(locale, "รอบการทำซ้ำ", "Recurrence")}
            value={
              job.recurrenceMonths
                ? locale === "th"
                  ? `ทุก ${job.recurrenceMonths} เดือน`
                  : `${thaiPrimary(locale, "ทุก", "Every")} ${job.recurrenceMonths} ${thaiPrimary(locale, "เดือน", "months")}`
                : "—"
            }
          />
          {job.completedAt ? (
            <Detail
              label={thaiPrimary(locale, "เสร็จสิ้น", "Completed")}
              value={formatter.format(job.completedAt)}
            />
          ) : null}
          {job.nextDueAt ? (
            <Detail
              label={thaiPrimary(locale, "กำหนดครั้งถัดไป", "Next due")}
              value={formatter.format(job.nextDueAt)}
            />
          ) : null}
        </CardContent>
      </Card>

      {service.canSchedule(profile) && job.assignmentStatus === "rejected" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {thaiPrimary(locale, "มอบหมายช่างใหม่", "Reassign technician")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TechnicianAssignmentForm
              type="pm"
              version={job.version}
              workId={job.id}
            />
          </CardContent>
        </Card>
      ) : null}

      {job.status === "scheduled" && service.canComplete(profile, job) ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {thaiPrimary(locale, "ปิดงาน PM", "PM completion")}
            </CardTitle>
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
            <CardTitle>
              {thaiPrimary(locale, "รายการตรวจ PM", "PM checklist")}
            </CardTitle>
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
                <Detail
                  label={thaiPrimary(
                    locale,
                    "หมายเหตุการปิดงาน",
                    "Completion notes",
                  )}
                  value={job.completionNotes}
                />
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
