import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
