import { ServiceJobIntakePrintDocument } from "@/features/service-jobs/components/service-job-print-document";
import { serviceJobManagementService } from "@/lib/service-jobs/service";
import { requireSession } from "@/lib/auth/dal";

export default async function PrintIntakePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const { profile } = await requireSession();
  const record = await serviceJobManagementService.get(jobId, profile);
  return <ServiceJobIntakePrintDocument job={record.job} />;
}
