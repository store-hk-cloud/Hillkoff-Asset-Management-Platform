import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { SchedulePmForm } from "@/features/pm/components/schedule-pm-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { thaiPrimary } from "@/lib/i18n/thai-primary";
import { PmManagementService } from "@/services/pm-management.service";

const service = new PmManagementService();

export const metadata = { title: "กำหนดแผน PM / PM Schedule" };

export default async function PmSchedulePage() {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canSchedule(profile)) notFound();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
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
              ? "กำหนดงาน PM รอบถัดไปและผู้รับผิดชอบ"
              : thaiPrimary(
                  locale,
                  "กำหนดงาน PM รอบถัดไปและผู้รับผิดชอบ",
                  "Schedule the next PM job and assign its technician.",
                )
          }
          eyebrow={thaiPrimary(
            locale,
            "งานบำรุงรักษา PM",
            "Preventive maintenance",
          )}
          title={thaiPrimary(locale, "กำหนดแผน PM", "PM Schedule")}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {thaiPrimary(locale, "รายละเอียดแผนงาน", "Schedule details")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SchedulePmForm />
        </CardContent>
      </Card>
    </section>
  );
}
