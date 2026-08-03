import { StatusBadge } from "@/components/shared/status-badge";

const labels: Record<string, string> = {
  draft: "ร่าง",
  received: "รับเรื่องแล้ว",
  scheduled: "นัดหมายแล้ว",
  assigned: "มอบหมายแล้ว",
  in_progress: "กำลังดำเนินการ",
  waiting_parts: "รออะไหล่",
  waiting_customer: "รอลูกค้า",
  assessment_pending: "รอประเมิน",
  approved: "อนุมัติแล้ว",
  completed: "เสร็จสิ้น",
  invoiced: "ออกใบแจ้งหนี้แล้ว",
  handed_off: "ส่งมอบแล้ว",
  closed: "ปิดงานแล้ว",
  cancelled: "ยกเลิก",
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
