import { redirect } from "next/navigation";

export const metadata = { title: "Create Repair Ticket" };

export default function NewRepairPage() {
  redirect("/service-jobs/new?workType=repair");
}
