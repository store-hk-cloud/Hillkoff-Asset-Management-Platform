import Link from "next/link";
import { CalendarDays, ClipboardCheck, History, Plus } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PmSearchForm } from "@/features/pm/components/pm-search-form";
import { pmSearchSchema } from "@/features/pm/schemas/pm.schema";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { thaiPrimary } from "@/lib/i18n/thai-primary";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();
export const metadata = {
  title: "บำรุงรักษาเชิงป้องกัน / Preventive Maintenance",
};

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function PmPage({ searchParams }: Props) {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();
  const params = await searchParams;
  const criteria = pmSearchSchema.parse({
    status: params.status,
    limit: params.limit,
  });
  const jobs = await service.list(profile, {
    status: criteria.status,
    limit: criteria.limit,
  });
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
      <PageHeader
        action={
          service.canSchedule(profile) ? (
            <Button asChild className="h-11 w-full sm:w-auto">
              <Link href="/pm/schedule">
                <Plus aria-hidden="true" className="size-4" />
                {thaiPrimary(locale, "กำหนดแผน PM", "PM Schedule")}
              </Link>
            </Button>
          ) : null
        }
        description={
          locale === "th"
            ? "วางแผน ติดตาม และบันทึกประวัติ PM ของเครื่อง"
            : thaiPrimary(
                locale,
                "วางแผน ติดตาม และบันทึกประวัติ PM ของเครื่อง",
                "Plan, track, and record preventive maintenance history.",
              )
        }
        eyebrow={thaiPrimary(
          locale,
          "งานบำรุงรักษา PM",
          "Preventive maintenance",
        )}
        title={thaiPrimary(
          locale,
          "บำรุงรักษาเชิงป้องกัน",
          "Preventive maintenance",
        )}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild className="h-12 justify-start" variant="outline">
          <Link href="/pm/calendar">
            <CalendarDays aria-hidden="true" className="size-5" />
            {thaiPrimary(locale, "ปฏิทิน PM", "PM Calendar")}
          </Link>
        </Button>
        <Button asChild className="h-12 justify-start" variant="outline">
          <Link href="/pm/history">
            <History aria-hidden="true" className="size-5" />
            {thaiPrimary(locale, "ประวัติ PM", "PM History")}
          </Link>
        </Button>
      </div>

      <PmSearchForm status={criteria.status} />

      <div>
        {jobs.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            message={thaiPrimary(
              locale,
              "ไม่มีงาน PM ที่รอทำ",
              "No upcoming PM jobs",
            )}
          />
        ) : (
          <>
            <p className="text-muted-foreground mb-3 text-sm">
              {thaiPrimary(
                locale,
                `แสดง ${jobs.length} รายการ`,
                `Showing ${jobs.length} results`,
              )}
            </p>
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
                    <CardContent className="space-y-1 text-sm">
                      <p className="font-medium">
                        {job.assetCode} · {job.assetName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatter.format(job.scheduledAt)} ·{" "}
                        {job.assignedTechnicianName}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            {jobs.length === criteria.limit && criteria.limit < 200 ? (
              <div className="mt-4 flex justify-center">
                <Link
                  className="ghost-button rounded-md border px-4 py-2 text-sm"
                  href={`/pm?status=${criteria.status}&limit=${criteria.limit + 50}`}
                >
                  {thaiPrimary(locale, "โหลดเพิ่ม", "Load more")}
                </Link>
              </div>
            ) : jobs.length === criteria.limit ? (
              <p className="text-muted-foreground mt-4 text-center text-xs">
                {thaiPrimary(
                  locale,
                  `แสดงผลสูงสุด ${criteria.limit} รายการแล้ว ลองปรับตัวกรองให้แคบลง`,
                  `Showing the first ${criteria.limit} results — narrow your filters to see more.`,
                )}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
