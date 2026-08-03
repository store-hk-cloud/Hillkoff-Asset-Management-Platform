import { StatusBadge } from "@/components/shared/status-badge";

const labels: Record<string, string> = {
  draft: "ร่าง / Draft",
  received: "รับเรื่องแล้ว / Received",
  scheduled: "นัดหมายแล้ว / Scheduled",
  assigned: "มอบหมายแล้ว / Assigned",
  in_progress: "กำลังดำเนินการ / In progress",
  waiting_parts: "รออะไหล่ / Waiting parts",
  waiting_customer: "รอลูกค้า / Waiting customer",
  assessment_pending: "รอประเมิน / Assessment pending",
  approved: "อนุมัติแล้ว / Approved",
  completed: "เสร็จสิ้น / Completed",
  invoiced: "ออกใบแจ้งหนี้แล้ว / Invoiced",
  handed_off: "ส่งมอบแล้ว / Handed off",
  closed: "ปิดงานแล้ว / Closed",
  cancelled: "ยกเลิก / Cancelled",
};

export function ServiceJobStatusBadge({ status }: { status: string }) {
  const tone = serviceJobStatusTone(status);
  return <StatusBadge tone={tone}>{labels[status] ?? status}</StatusBadge>;
}

export function serviceJobStatusTone(
  status: string,
): "success" | "warning" | "danger" | "info" {
  return ["completed", "approved", "invoiced", "handed_off", "closed"].includes(
    status,
  )
    ? "success"
    : ["waiting_parts", "waiting_customer", "assessment_pending"].includes(
          status,
        )
      ? "warning"
      : ["cancelled"].includes(status)
        ? "danger"
        : "info";
}
