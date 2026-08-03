import { redirect } from "next/navigation";

export const metadata = { title: "Schedule Installation" };

export default function ScheduleInstallationPage() {
  redirect("/service-jobs/new?workType=installation");
}
