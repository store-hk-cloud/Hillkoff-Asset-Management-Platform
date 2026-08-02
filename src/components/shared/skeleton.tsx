import { cn } from "@/lib/utils";

type SkeletonProps = Readonly<{
  className?: string;
}>;

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-muted rounded-md motion-safe:animate-pulse", className)}
    />
  );
}
