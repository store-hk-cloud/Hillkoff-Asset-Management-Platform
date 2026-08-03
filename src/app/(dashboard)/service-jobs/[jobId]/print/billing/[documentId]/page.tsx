import { notFound } from "next/navigation";
import { ServiceJobBillingPrintDocument } from "@/features/service-jobs/components/service-job-print-document";
import { serviceJobManagementService } from "@/lib/service-jobs/service";
import { requireSession } from "@/lib/auth/dal";
export default async function PrintBillingPage({
  params,
}: {
  params: Promise<{ jobId: string; documentId: string }>;
}) {
  const { jobId, documentId } = await params;
  const { profile } = await requireSession();
  const [record, document] = await Promise.all([
    serviceJobManagementService.get(jobId, profile),
    serviceJobManagementService.getBillingDocument(jobId, documentId, profile),
  ]);
  if (!document) notFound();
  return (
    <ServiceJobBillingPrintDocument document={document} job={record.job} />
  );
}
