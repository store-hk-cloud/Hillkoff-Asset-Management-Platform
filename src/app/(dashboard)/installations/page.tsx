import Link from "next/link";
import { CalendarClock, MapPin, Plus, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InstallationStatus } from "@/domain/entities/installation";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { InstallationManagementService } from "@/services/installation-management.service";

const service = new InstallationManagementService();
export const metadata = { title: "Installation Queue" };

export default async function InstallationsPage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();

  const installations = await service.listQueue(profile);
  const dateTimeFormatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    },
  );
  const statusLabels: Record<InstallationStatus, string> =
    locale === "th"
      ? {
          scheduled: "นัดหมายแล้ว",
          in_progress: "กำลังดำเนินงาน",
          completed: "เสร็จสิ้น",
          cancelled: "ยกเลิก",
        }
      : {
          scheduled: "Scheduled",
          in_progress: "In progress",
          completed: "Completed",
          cancelled: "Cancelled",
        };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {t("nav.installations")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("installations.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {locale === "th"
              ? "คิวงานติดตั้งที่รอดำเนินการและกำลังทำงาน"
              : "Installation work that is scheduled or currently in progress"}
          </p>
        </div>
        {service.canSchedule(profile) ? (
          <Button asChild className="h-11 w-full sm:w-auto">
            <Link href="/installations/schedule">
              <Plus aria-hidden="true" className="size-4" />
              {t("installations.schedule")}
            </Link>
          </Button>
        ) : null}
      </div>

      {installations.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <CalendarClock
            aria-hidden="true"
            className="text-muted-foreground mx-auto mb-3 size-8"
          />
          <p className="text-muted-foreground text-sm">
            {locale === "th"
              ? "ไม่มีงานติดตั้งในคิว"
              : "No installations in the queue"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {installations.map((installation) => (
            <Link
              className="group"
              href={`/installations/${installation.id}`}
              key={installation.id}
            >
              <Card className="group-hover:border-primary/50 h-full transition-colors">
                <CardHeader className="gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">
                      {installation.assetName}
                    </CardTitle>
                    <Status
                      label={statusLabels[installation.status]}
                      status={installation.status}
                    />
                  </div>
                  <p className="text-muted-foreground font-mono text-xs">
                    {installation.assetCode}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row icon={CalendarClock}>
                    {dateTimeFormatter.format(installation.scheduledAt)}
                  </Row>
                  <Row icon={UserRound}>
                    {installation.assignedTechnicianName}
                  </Row>
                  <Row icon={MapPin}>{installation.address}</Row>
                  <p className="text-muted-foreground border-t pt-3 text-xs">
                    {installation.customerName} ·{" "}
                    {installation.installationNumber}
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

function Row({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon: typeof CalendarClock;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon
        aria-hidden="true"
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
      />
      <span>{children}</span>
    </div>
  );
}

function Status({
  label,
  status,
}: {
  label: string;
  status: InstallationStatus;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
        status === "in_progress"
          ? "bg-blue-100 text-blue-800"
          : "bg-amber-100 text-amber-800",
      )}
    >
      {label}
    </span>
  );
}
