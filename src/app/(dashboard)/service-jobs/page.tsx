import { ServiceJobList } from "@/features/service-jobs/components/service-job-list";
import { requireSession } from "@/lib/auth/dal";
export const metadata = { title: "Service jobs" };
export default async function ServiceJobsPage() {
  const { profile } = await requireSession();
  const canCreate = ["admin", "sales", "warehouse", "branch"].includes(
    profile.role,
  );
  return <ServiceJobList canCreate={canCreate} />;
}
