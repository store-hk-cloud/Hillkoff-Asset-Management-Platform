import { Skeleton } from "@/components/shared/skeleton";

export default function UsersLoading() {
  return (
    <section aria-label="Loading users" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton className="h-24" key={index} />
        ))}
      </div>
    </section>
  );
}
