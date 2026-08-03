import type { ServiceJobWorkType } from "@/domain/entities/service-job";
import { PageHeader } from "@/components/shared/page-header";
import { ServiceJobIntakeForm } from "@/features/service-jobs/components/service-job-intake-form";
import { requireRole } from "@/lib/auth/dal";

type Props = {
  searchParams: Promise<{ workType?: string }>;
};

export const metadata = { title: "New service job" };
export default async function NewServiceJobPage({ searchParams }: Props) {
  await requireRole(["admin", "sales", "warehouse", "branch"]);
  const requestedWorkType = (await searchParams).workType;
  const initialWorkType: ServiceJobWorkType | undefined =
    requestedWorkType === "repair" ||
    requestedWorkType === "installation" ||
    requestedWorkType === "new_machine_test"
      ? requestedWorkType
      : undefined;
  return (
    <section className="space-y-6">
      <PageHeader
        description="Capture a complete customer, contact, asset, warranty, and fulfillment snapshot."
        eyebrow="Service operations"
        title="New service job"
      />
      <ServiceJobIntakeForm {...(initialWorkType ? { initialWorkType } : {})} />
    </section>
  );
}
