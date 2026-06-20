import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateRepairForm } from "@/features/repairs/components/create-repair-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { RepairManagementService } from "@/services/repair-management.service";

const service = new RepairManagementService();

export const metadata = { title: "Create Repair Ticket" };

export default async function NewRepairPage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canCreate(profile)) notFound();

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/repairs"
        >
          ← {t("repairs.title")}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("repairs.create")}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "th" ? "รายละเอียดปัญหา" : "Problem Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CreateRepairForm />
        </CardContent>
      </Card>
    </section>
  );
}
