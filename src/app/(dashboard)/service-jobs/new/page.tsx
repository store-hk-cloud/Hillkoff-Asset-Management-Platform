import type { ServiceJobWorkType } from "@/domain/entities/service-job";
import { PageHeader } from "@/components/shared/page-header";
import { ServiceJobIntakeForm } from "@/features/service-jobs/components/service-job-intake-form";
import { requireRole } from "@/lib/auth/dal";

type Props = {
  searchParams: Promise<{ workType?: string }>;
};

export const metadata = { title: "สร้างใบงานช่าง | Service Jobs" };
export default async function NewServiceJobPage({ searchParams }: Props) {
  await requireRole(["admin", "sales", "warehouse", "branch"]);
  const requestedWorkType = (await searchParams).workType;
  const initialWorkType: ServiceJobWorkType | undefined =
    requestedWorkType === "repair" ||
    requestedWorkType === "installation" ||
    requestedWorkType === "new_machine_test"
      ? requestedWorkType
      : undefined;
  return (
    <section className="space-y-6">
      <PageHeader
        description="บันทึกข้อมูลลูกค้า ผู้ติดต่อ เครื่อง การรับประกัน และรูปแบบรับบริการให้ครบ"
        eyebrow="Service Jobs"
        title="สร้างใบงานช่าง"
      />
      <ServiceJobIntakeForm {...(initialWorkType ? { initialWorkType } : {})} />
    </section>
  );
}
