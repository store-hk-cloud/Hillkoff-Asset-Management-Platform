import Link from "next/link";
import { CalendarDays, ClipboardCheck, History, Plus } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();
export const metadata = { title: "Preventive Maintenance" };

export default async function PmPage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();
  const jobs = await service.list(profile, { status: "scheduled" });
  const formatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    },
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{t("nav.pm")}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("pm.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {locale === "th"
              ? "วางแผน ติดตาม และบันทึกประวัติ PM ของทรัพย์สิน"
              : "Plan, track, and record preventive maintenance history."}
          </p>
        </div>
        {service.canSchedule(profile) ? (
          <Button asChild className="h-11 w-full sm:w-auto">
            <Link href="/pm/schedule">
              <Plus aria-hidden="true" className="size-4" />
              {locale === "th" ? "กำหนดแผน PM" : "PM Schedule"}
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild className="h-12 justify-start" variant="outline">
          <Link href="/pm/calendar">
            <CalendarDays aria-hidden="true" className="size-5" />
            {locale === "th" ? "ปฏิทิน PM" : "PM Calendar"}
          </Link>
        </Button>
        <Button asChild className="h-12 justify-start" variant="outline">
          <Link href="/pm/history">
            <History aria-hidden="true" className="size-5" />
            {locale === "th" ? "ประวัติ PM" : "PM History"}
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">
          {locale === "th" ? "งาน PM ที่กำลังจะถึง" : "Upcoming PM"}
        </h2>
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <ClipboardCheck
              aria-hidden="true"
              className="text-muted-foreground mx-auto mb-3 size-8"
            />
            <p className="text-muted-foreground text-sm">
              {locale === "th" ? "ไม่มีงาน PM ที่รอทำ" : "No upcoming PM jobs"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <Link href={`/pm/${job.id}`} key={job.id}>
                <Card className="hover:border-primary/50 h-full transition-colors">
                  <CardHeader className="gap-2">
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <p className="text-muted-foreground font-mono text-xs">
                      {job.jobNumber}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="font-medium">
                      {job.assetCode} · {job.assetName}
                    </p>
                    <p>{formatter.format(job.scheduledAt)}</p>
                    <p className="text-muted-foreground">
                      {job.assignedTechnicianName}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
