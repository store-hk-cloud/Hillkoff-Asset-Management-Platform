import { notFound } from "next/navigation";
import { ServiceJobAssessmentPrintDocument } from "@/features/service-jobs/components/service-job-print-document";
import { serviceJobManagementService } from "@/lib/service-jobs/service";
import { requireSession } from "@/lib/auth/dal";
export default async function PrintAssessmentPage({
  params,
}: {
  params: Promise<{ jobId: string; assessmentId: string }>;
}) {
  const { jobId, assessmentId } = await params;
  const { profile } = await requireSession();
  const [record, assessment] = await Promise.all([
    serviceJobManagementService.get(jobId, profile),
    serviceJobManagementService.getAssessment(jobId, assessmentId, profile),
  ]);
  if (!assessment) notFound();
  return (
    <ServiceJobAssessmentPrintDocument job={record.job} record={assessment} />
  );
}
