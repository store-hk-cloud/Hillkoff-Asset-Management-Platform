import type { ServiceJobWorkType } from "@/domain/entities/service-job";
import { ServiceJobList } from "@/features/service-jobs/components/service-job-list";
import { requireSession } from "@/lib/auth/dal";

type Props = {
  searchParams: Promise<{ workType?: string }>;
};

export const metadata = { title: "งานบริการช่าง / Service Jobs" };

export default async function ServiceJobsPage({ searchParams }: Props) {
  const { profile } = await requireSession();
  const canCreate = ["admin", "sales", "warehouse", "branch"].includes(
    profile.role,
  );
  const requestedWorkType = (await searchParams).workType;
  const initialWorkType: ServiceJobWorkType | "all" =
    requestedWorkType === "repair" ||
    requestedWorkType === "installation" ||
    requestedWorkType === "new_machine_test"
      ? requestedWorkType
      : "all";
  return (
    <ServiceJobList canCreate={canCreate} initialWorkType={initialWorkType} />
  );
}
