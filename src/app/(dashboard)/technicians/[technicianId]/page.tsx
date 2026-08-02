import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { TechnicianWorkspace } from "@/features/technician/components/technician-workspace";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { TechnicianWorkspaceService } from "@/services/technician-workspace.service";

const service = new TechnicianWorkspaceService();

type Props = {
  params: Promise<{ technicianId: string }>;
};

export const metadata = { title: "Technician history" };

export default async function TechnicianHistoryPage({ params }: Props) {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  const { technicianId } = await params;
  const result = await service
    .workspaceFor(technicianId, profile)
    .catch(() => null);
  if (!result) notFound();

  return (
    <section className="space-y-6">
      <PageHeader
        description={result.technician.email}
        eyebrow={
          locale === "th"
            ? "Dashboard และประวัติงานรายบุคคล"
            : "Technician dashboard and history"
        }
        title={result.technician.displayName}
      />
      <TechnicianWorkspace readOnly workspace={result.workspace} />
    </section>
  );
}
