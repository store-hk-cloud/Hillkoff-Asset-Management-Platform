import { Skeleton } from "@/components/shared/skeleton";

export default function InventoryLoading() {
  return (
    <section aria-label="Loading inventory" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton className="h-28" key={index} />
        ))}
      </div>
    </section>
  );
}
