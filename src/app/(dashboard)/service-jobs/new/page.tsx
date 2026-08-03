import { PageHeader } from "@/components/shared/page-header";
import { ServiceJobIntakeForm } from "@/features/service-jobs/components/service-job-intake-form";
import { requireRole } from "@/lib/auth/dal";
export const metadata = { title: "New service job" };
export default async function NewServiceJobPage() {
  await requireRole(["admin", "sales", "warehouse", "branch"]);
  return (
    <section className="space-y-6">
      <PageHeader
        description="Capture a complete customer, contact, asset, warranty, and fulfillment snapshot."
        eyebrow="Service operations"
        title="New service job"
      />
      <ServiceJobIntakeForm />
    </section>
  );
}
