import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceJobAssignmentForm } from "@/features/service-jobs/components/service-job-assignment-form";
import { ServiceJobExecutionForm } from "@/features/service-jobs/components/service-job-execution-form";
export function ServiceJobWorkbench({
  jobId,
  version,
  technicians = [],
}: {
  jobId: string;
  version: number;
  technicians?: readonly { id: string; name: string }[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle>การปฏิบัติงานหน้างาน / Field execution</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceJobExecutionForm jobId={jobId} version={version} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>การมอบหมายงาน / Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceJobAssignmentForm jobId={jobId} technicians={technicians} />
        </CardContent>
      </Card>
    </div>
  );
}
