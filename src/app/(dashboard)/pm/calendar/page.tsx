import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PmJob } from "@/domain/entities/pm-job";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();
type Props = { searchParams: Promise<{ month?: string }> };

function selectedMonth(value: string | undefined): {
  year: number;
  month: number;
} {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    if (year && month && month >= 1 && month <= 12) {
      return { year, month };
    }
  }
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "numeric",
    timeZone: "Asia/Bangkok",
  }).formatToParts(now);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function monthKey(year: number, month: number): string {
  const anchor = new Date(Date.UTC(year, month - 1, 15));
  return `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, "0")}`;
}

function bangkokDay(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      day: "numeric",
      timeZone: "Asia/Bangkok",
    }).format(date),
  );
}

export default async function PmCalendarPage({ searchParams }: Props) {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();
  const { year, month } = selectedMonth((await searchParams).month);
  const anchor = new Date(Date.UTC(year, month - 1, 15));
  const start = new Date(Date.UTC(year, month - 1, 1, -7));
  const end = new Date(Date.UTC(year, month, 1, -7) - 1);
  const jobs = await service.list(profile, {
    status: "all",
    from: start,
    to: end,
  });
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const jobsByDay = new Map<number, PmJob[]>();
  for (const job of jobs) {
    const day = bangkokDay(job.scheduledAt);
    jobsByDay.set(day, [...(jobsByDay.get(day) ?? []), job]);
  }
  const formatterLocale = locale === "th" ? "th-TH" : "en-US";
  const monthFormatter = new Intl.DateTimeFormat(formatterLocale, {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const timeFormatter = new Intl.DateTimeFormat(formatterLocale, {
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });

  return (
    <section className="space-y-6">
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/pm"
        >
          ← {t("pm.title")}
        </Link>
        <div className="mt-3 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {locale === "th" ? "ปฏิทิน PM" : "PM Calendar"}
          </h1>
          <div className="flex gap-2">
            <Button asChild size="icon" variant="outline">
              <Link
                aria-label={
                  locale === "th" ? "เดือนก่อนหน้า" : "Previous month"
                }
                href={`/pm/calendar?month=${monthKey(year, month - 1)}`}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <Button asChild size="icon" variant="outline">
              <Link
                aria-label={locale === "th" ? "เดือนถัดไป" : "Next month"}
                href={`/pm/calendar?month=${monthKey(year, month + 1)}`}
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {monthFormatter.format(anchor)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
          (day) => (
            <Card className="py-0" key={day}>
              <CardContent className="min-h-28 p-3">
                <p className="mb-2 text-sm font-semibold">{day}</p>
                <div className="space-y-2">
                  {(jobsByDay.get(day) ?? []).map((job) => (
                    <Link
                      className="bg-muted hover:bg-muted/70 block rounded-md p-2 text-xs"
                      href={`/pm/${job.id}`}
                      key={job.id}
                    >
                      <span className="font-medium">{job.assetCode}</span>
                      <span className="block">{job.title}</span>
                      <span className="text-muted-foreground">
                        {timeFormatter.format(job.scheduledAt)} · {job.status}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </section>
  );
}
