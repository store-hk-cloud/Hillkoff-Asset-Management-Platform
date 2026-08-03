import { redirect } from "next/navigation";

export const metadata = { title: "Installation Queue" };

/**
 * Installations are operated from the canonical service-job queue. Legacy
 * detail and API routes remain available for historical records and migration.
 */
export default function InstallationsPage() {
  redirect("/service-jobs?workType=installation");
}
