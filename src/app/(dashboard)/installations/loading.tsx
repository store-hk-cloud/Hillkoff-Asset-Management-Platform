import { Skeleton } from "@/components/shared/skeleton";

export default function InstallationsLoading() {
  return (
    <section aria-label="Loading installations" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-64" />
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
