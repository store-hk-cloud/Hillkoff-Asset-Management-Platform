import { serviceJobSearchSchema } from "@/features/service-jobs/schemas/service-job.schema";
import { ServiceJobList } from "@/features/service-jobs/components/service-job-list";
import { requireSession } from "@/lib/auth/dal";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export const metadata = { title: "Service Jobs" };

export default async function ServiceJobsPage({ searchParams }: Props) {
  const { profile } = await requireSession();
  const canCreate = ["admin", "sales", "warehouse", "branch"].includes(
    profile.role,
  );
  const params = await searchParams;
  const criteria = serviceJobSearchSchema.parse({
    status: params.status,
    workType: params.workType,
    query: params.query,
    limit: params.limit,
  });
  return <ServiceJobList canCreate={canCreate} criteria={criteria} />;
}
