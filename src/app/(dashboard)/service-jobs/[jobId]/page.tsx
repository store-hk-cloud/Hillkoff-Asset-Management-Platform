import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ServiceJobPrintActions } from "@/features/service-jobs/components/service-job-print-actions";
import { ServiceJobStatusBadge } from "@/features/service-jobs/components/service-job-status-badge";
import { ServiceJobWorkbench } from "@/features/service-jobs/components/service-job-workbench";
import { serviceJobManagementService } from "@/lib/service-jobs/service";
import { requireSession } from "@/lib/auth/dal";
export default async function ServiceJobDetailsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const { profile } = await requireSession();
  const result = await serviceJobManagementService.get(jobId, profile);
  if (!result) notFound();
  const [assessments, billingDocuments] = await Promise.all([
    serviceJobManagementService.listAssessments(jobId, profile),
    ["admin", "executive", "sales", "warehouse", "customer"].includes(
      profile.role,
    )
      ? serviceJobManagementService.listBillingDocuments(jobId, profile)
      : Promise.resolve([]),
  ]);
  return (
    <section className="space-y-6">
      <PageHeader
        description={result.job.description}
        eyebrow={result.job.jobNumber}
        title={result.job.title}
      />
      <div className="flex gap-2">
        <ServiceJobStatusBadge status={result.job.status} />
        <span className="text-muted-foreground text-sm">
          {result.job.customer.name}
        </span>
      </div>
      <ServiceJobPrintActions
        assessmentId={assessments[0]?.assessment.id}
        billingDocumentId={billingDocuments[0]?.id}
        jobId={result.job.id}
      />
      <ServiceJobWorkbench jobId={result.job.id} version={result.job.version} />
    </section>
  );
}
