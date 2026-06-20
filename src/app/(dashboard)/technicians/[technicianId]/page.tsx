import { notFound } from "next/navigation";

import { TechnicianWorkspace } from "@/features/technician/components/technician-workspace";
import { requireSession } from "@/lib/auth/dal";
import { TechnicianWorkspaceService } from "@/services/technician-workspace.service";

const service = new TechnicianWorkspaceService();

type Props = {
  params: Promise<{ technicianId: string }>;
};

export const metadata = { title: "Technician history" };

export default async function TechnicianHistoryPage({ params }: Props) {
  const { profile } = await requireSession();
  const { technicianId } = await params;
  const result = await service
    .workspaceFor(technicianId, profile)
    .catch(() => null);
  if (!result) notFound();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          Dashboard และประวัติงานรายบุคคล
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {result.technician.displayName}
        </h1>
        <p className="text-muted-foreground text-sm">
          {result.technician.email}
        </p>
      </div>
      <TechnicianWorkspace readOnly workspace={result.workspace} />
    </section>
  );
}
