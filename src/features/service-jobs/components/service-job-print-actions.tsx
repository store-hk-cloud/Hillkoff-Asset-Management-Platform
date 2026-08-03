import Link from "next/link";

import { Button } from "@/components/ui/button";

export function ServiceJobPrintActions({
  jobId,
  assessmentId,
  billingDocumentId,
}: {
  jobId: string;
  assessmentId?: string | undefined;
  billingDocumentId?: string | undefined;
}) {
  return (
    <section className="bg-card rounded-lg border p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="font-semibold">เอกสารใบงาน</h2>
        <p className="text-muted-foreground text-sm">
          เปิดดูและพิมพ์เอกสารตามแบบฟอร์มมาตรฐาน A4
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/service-jobs/${jobId}/print/intake`}>
            พิมพ์ใบรับงาน
          </Link>
        </Button>
        {assessmentId ? (
          <Button asChild size="sm" variant="outline">
            <Link
              href={`/service-jobs/${jobId}/print/assessment/${assessmentId}`}
            >
              พิมพ์ใบประเมิน
            </Link>
          </Button>
        ) : null}
        {billingDocumentId ? (
          <Button asChild size="sm" variant="outline">
            <Link
              href={`/service-jobs/${jobId}/print/billing/${billingDocumentId}`}
            >
              พิมพ์บิล
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
