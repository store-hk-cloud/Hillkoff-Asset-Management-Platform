import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PmError } from "@/domain/errors/pm.error";
import { PmCompletionForm } from "@/features/pm/components/pm-completion-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();
type Props = { params: Promise<{ pmId: string }> };

export default async function PmDetailPage({ params }: Props) {
  const { locale, t } = await getServerTranslator();
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
          ← {t("pm.title")}
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
          <CardTitle>
            {locale === "th" ? "รายละเอียด PM" : "PM Details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Detail
            label={locale === "th" ? "ทรัพย์สิน" : "Asset"}
            value={`${job.assetCode} · ${job.assetName}`}
          />
          <Detail
            label={locale === "th" ? "กำหนดวัน" : "Scheduled"}
            value={formatter.format(job.scheduledAt)}
          />
          <Detail
            label={locale === "th" ? "ช่างผู้รับผิดชอบ" : "Technician"}
            value={job.assignedTechnicianName}
          />
          <Detail
            label={locale === "th" ? "รอบการทำซ้ำ" : "Recurrence"}
            value={
              job.recurrenceMonths
                ? locale === "th"
                  ? `ทุก ${job.recurrenceMonths} เดือน`
                  : `Every ${job.recurrenceMonths} months`
                : "—"
            }
          />
          {job.completedAt ? (
            <Detail
              label={locale === "th" ? "เสร็จสิ้น" : "Completed"}
              value={formatter.format(job.completedAt)}
            />
          ) : null}
          {job.nextDueAt ? (
            <Detail
              label={locale === "th" ? "กำหนดครั้งถัดไป" : "Next Due"}
              value={formatter.format(job.nextDueAt)}
            />
          ) : null}
        </CardContent>
      </Card>

      {job.status === "scheduled" && service.canComplete(profile, job) ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "th" ? "ปิดงาน PM" : "PM Completion"}
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
              {locale === "th" ? "รายการตรวจ PM" : "PM Checklist"}
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
                  label={
                    locale === "th" ? "หมายเหตุการปิดงาน" : "Completion Notes"
                  }
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
