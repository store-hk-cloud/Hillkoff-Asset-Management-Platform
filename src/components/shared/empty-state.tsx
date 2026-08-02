import type { LucideIcon } from "lucide-react";

type EmptyStateProps = Readonly<{
  icon: LucideIcon;
  message: string;
}>;

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <Icon
        aria-hidden="true"
        className="text-muted-foreground mx-auto mb-3 size-8"
      />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
