import { PrintDocumentShell } from "@/components/shared/print-document-shell";
export default async function PrintIntakePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return (
    <PrintDocumentShell title="Service intake">
      <p>
        Service job: <strong>{jobId}</strong>
      </p>
      <p className="mt-4">Customer and asset snapshot</p>
    </PrintDocumentShell>
  );
}
