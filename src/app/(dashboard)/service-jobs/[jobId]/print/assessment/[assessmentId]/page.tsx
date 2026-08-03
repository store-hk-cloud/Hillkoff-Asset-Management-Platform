import { PrintDocumentShell } from "@/components/shared/print-document-shell";
export default async function PrintAssessmentPage({
  params,
}: {
  params: Promise<{ jobId: string; assessmentId: string }>;
}) {
  const { jobId, assessmentId } = await params;
  return (
    <PrintDocumentShell title="Service assessment">
      <p>
        Service job: <strong>{jobId}</strong>
      </p>
      <p>
        Assessment revision: <strong>{assessmentId}</strong>
      </p>
    </PrintDocumentShell>
  );
}
