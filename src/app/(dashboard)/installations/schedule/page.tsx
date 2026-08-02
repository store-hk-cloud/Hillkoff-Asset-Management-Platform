import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ScheduleInstallationForm } from "@/features/installations/components/schedule-installation-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { InstallationManagementService } from "@/services/installation-management.service";

const service = new InstallationManagementService();

export const metadata = { title: "Schedule Installation" };

export default async function ScheduleInstallationPage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canSchedule(profile)) notFound();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/installations"
        >
          ← {t("installations.title")}
        </Link>
        <PageHeader
          description={
            locale === "th"
              ? "เครื่องต้องขายและผูกกับ Customer ID ก่อนสร้างนัดหมาย"
              : "The asset must be sold and linked to this Customer ID before scheduling."
          }
          eyebrow={t("nav.installations")}
          title={t("installations.schedule")}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "th" ? "รายละเอียดการติดตั้ง" : "Installation Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduleInstallationForm />
        </CardContent>
      </Card>
    </section>
  );
}
