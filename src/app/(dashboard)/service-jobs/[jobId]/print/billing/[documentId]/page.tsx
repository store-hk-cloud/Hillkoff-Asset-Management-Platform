import { PrintDocumentShell } from "@/components/shared/print-document-shell";
export default async function PrintBillingPage({
  params,
}: {
  params: Promise<{ jobId: string; documentId: string }>;
}) {
  const { jobId, documentId } = await params;
  return (
    <PrintDocumentShell
      copy="Original / Customer copy"
      title="Billing document"
    >
      <p>
        Service job: <strong>{jobId}</strong>
      </p>
      <p>
        Document: <strong>{documentId}</strong>
      </p>
    </PrintDocumentShell>
  );
}
