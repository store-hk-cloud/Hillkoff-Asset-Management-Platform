import { notFound } from "next/navigation";

import { TechnicianWorkspace } from "@/features/technician/components/technician-workspace";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
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
      <div>
        <p className="text-muted-foreground text-sm">
          {locale === "th" ? "พื้นที่ทำงานภาคสนาม" : "Field service workspace"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {locale === "th" ? "งานของฉัน" : "My technician work"}
        </h1>
      </div>
      <TechnicianWorkspace workspace={workspace} />
    </section>
  );
}
