import { Skeleton } from "@/components/shared/skeleton";

export default function AssetsLoading() {
  return (
    <section aria-label="Loading assets" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton className="h-20" key={index} />
        ))}
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton className="h-24" key={index} />
        ))}
      </div>
    </section>
  );
}
