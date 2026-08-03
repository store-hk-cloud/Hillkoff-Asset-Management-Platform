import Link from "next/link";
import { History } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { thaiPrimary } from "@/lib/i18n/thai-primary";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();
export default async function PmHistoryPage() {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();
  const jobs = await service.list(profile, { status: "completed" });
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
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/pm"
        >
          ← {thaiPrimary(locale, "งานบำรุงรักษา PM", "Preventive maintenance")}
        </Link>
        <PageHeader
          description={
            locale === "th"
              ? "ตรวจสอบประวัติการบำรุงรักษาเชิงป้องกันที่เสร็จสิ้นแล้ว"
              : thaiPrimary(
                  locale,
                  "ตรวจสอบประวัติการบำรุงรักษาเชิงป้องกันที่เสร็จสิ้นแล้ว",
                  "Review completed preventive maintenance history.",
                )
          }
          eyebrow={thaiPrimary(
            locale,
            "งานบำรุงรักษา PM",
            "Preventive maintenance",
          )}
          title={thaiPrimary(locale, "ประวัติ PM", "PM History")}
        />
      </div>
      {jobs.length === 0 ? (
        <EmptyState
          icon={History}
          message={thaiPrimary(locale, "ยังไม่มีประวัติ PM", "No PM history")}
        />
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
                    {thaiPrimary(locale, "เสร็จสิ้น", "Completed")}{" "}
                    {job.completedAt ? formatter.format(job.completedAt) : "—"}
                  </p>
                  <p className="text-muted-foreground">
                    {thaiPrimary(locale, "กำหนดครั้งถัดไป", "Next due")}{" "}
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
