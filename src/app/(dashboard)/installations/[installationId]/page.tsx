import Link from "next/link";
import { CheckCircle2, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallationError } from "@/domain/errors/installation.error";
import { InstallationWorkForm } from "@/features/installations/components/installation-work-form";
import { TechnicianAssignmentForm } from "@/features/technician/components/technician-assignment-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { InstallationManagementService } from "@/services/installation-management.service";

const service = new InstallationManagementService();
type InstallationDetailPageProps = {
  params: Promise<{ installationId: string }>;
};

async function loadInstallation(
  id: string,
  profile: Parameters<InstallationManagementService["get"]>[1],
) {
  try {
    return await service.get(id, profile);
  } catch (error) {
    if (
      error instanceof InstallationError &&
      (error.code === "INSTALLATION_NOT_FOUND" ||
        error.code === "INSTALLATION_ACCESS_DENIED")
    ) {
      notFound();
    }
    throw error;
  }
}

export default async function InstallationDetailPage({
  params,
}: InstallationDetailPageProps) {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  const { installationId } = await params;
  const installation = await loadInstallation(installationId, profile);
  const canExecute = service.canExecute(profile, installation);
  const dateTimeFormatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    },
  );
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      dateStyle: "medium",
      timeZone: "Asia/Bangkok",
    },
  );

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/installations"
        >
          ← {t("installations.title")}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {installation.assetName}
          </h1>
          <span className="bg-muted rounded-full px-2 py-1 text-xs font-medium">
            {installation.status.replace("_", " ")}
          </span>
        </div>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          {installation.assetCode} · {installation.installationNumber}
        </p>
      </div>

      {service.canSchedule(profile) &&
      installation.assignmentStatus === "rejected" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "th" ? "มอบหมายช่างใหม่" : "Reassign technician"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TechnicianAssignmentForm
              type="installation"
              version={installation.version}
              workId={installation.id}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{locale === "th" ? "นัดหมาย" : "Appointment"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Detail
              label={locale === "th" ? "กำหนดติดตั้ง" : "Scheduled for"}
              value={dateTimeFormatter.format(installation.scheduledAt)}
            />
            <Detail
              label={locale === "th" ? "ลูกค้า" : "Customer"}
              value={installation.customerName}
            />
            <Detail
              label={t("field.customerId")}
              value={installation.customerId}
            />
            <div className="flex items-start gap-2">
              <MapPin
                aria-hidden="true"
                className="text-muted-foreground mt-0.5 size-4 shrink-0"
              />
              <span>{installation.address}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "th"
                ? "ผู้รับผิดชอบและการรับประกัน"
                : "Assignment & Warranty"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <UserRound
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
              <span>{installation.assignedTechnicianName}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
              <span>
                {locale === "th" ? "รับประกัน" : "Warranty"}{" "}
                {installation.warrantyMonths}{" "}
                {locale === "th" ? "เดือน" : "months"}
              </span>
            </div>
            {installation.completedAt ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 aria-hidden="true" className="size-4" />
                <span>
                  {locale === "th" ? "เสร็จสิ้น" : "Completed"}{" "}
                  {dateFormatter.format(installation.completedAt)}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {canExecute ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "th" ? "ปฏิบัติงานติดตั้ง" : "Installation Work"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InstallationWorkForm
              initialChecklist={installation.checklist}
              initialStatus={installation.status}
              initialVersion={installation.version}
              installationId={installation.id}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground py-6 text-sm">
            {locale === "th"
              ? "คุณมีสิทธิ์ดูสถานะงานนี้ แต่การปฏิบัติงานต้องดำเนินการโดยช่างที่ได้รับมอบหมายหรือผู้ดูแลระบบ"
              : "You may view this job, but only the assigned technician or an administrator can perform the work."}
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
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
