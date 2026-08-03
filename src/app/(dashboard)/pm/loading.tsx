import { Skeleton } from "@/components/shared/skeleton";

export default function PreventiveMaintenanceLoading() {
  return (
    <section
      aria-label="กำลังโหลดงานบำรุงรักษา / Loading preventive maintenance"
      className="space-y-6"
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton className="h-28" key={index} />
        ))}
      </div>
    </section>
  );
}
