import { StatusBadge } from "@/components/shared/status-badge";

const labels: Record<string, string> = {
  draft: "Draft",
  received: "Received",
  scheduled: "Scheduled",
  assigned: "Assigned",
  in_progress: "In progress",
  waiting_parts: "Waiting parts",
  waiting_customer: "Waiting customer",
  assessment_pending: "Assessment pending",
  approved: "Approved",
  completed: "Completed",
  invoiced: "Invoiced",
  handed_off: "Handed off",
  closed: "Closed",
  cancelled: "Cancelled",
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
