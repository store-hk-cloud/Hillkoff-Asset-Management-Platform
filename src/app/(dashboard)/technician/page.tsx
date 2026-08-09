import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { TechnicianWorkspace } from "@/features/technician/components/technician-workspace";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { thaiPrimary } from "@/lib/i18n/thai-primary";
import { TechnicianWorkspaceService } from "@/services/technician-workspace.service";

const service = new TechnicianWorkspaceService();
export const metadata = { title: "Technician Workspace" };

export default async function TechnicianPage() {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  if (profile.role !== "technician") notFound();
  const workspace = await service.workspace(profile);

  return (
    <section className="space-y-6">
      <PageHeader
        description={thaiPrimary(
          locale,
          "ดูงานที่ได้รับมอบหมายและอัปเดตสถานะจากหน้างาน",
          "Review assigned work and update status from the field.",
        )}
        eyebrow={thaiPrimary(locale, "พื้นที่ทำงานภาคสนาม", "Field workspace")}
        title={thaiPrimary(locale, "งานของฉัน", "My technician work")}
      />
      <TechnicianWorkspace workspace={workspace} />
    </section>
  );
}
