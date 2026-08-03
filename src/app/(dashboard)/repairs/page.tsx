import { redirect } from "next/navigation";

export const metadata = { title: "Repair Management" };

/**
 * Repairs are operated from the canonical service-job queue. Legacy detail
 * and API routes remain available for historical records and migration.
 */
export default function RepairsPage() {
  redirect("/service-jobs?workType=repair");
}
