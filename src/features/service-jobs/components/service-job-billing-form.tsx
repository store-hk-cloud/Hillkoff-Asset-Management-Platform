"use client";
import { Button } from "@/components/ui/button";
export function ServiceJobBillingForm({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={disabled} type="button">
        Issue service invoice
      </Button>
      <Button disabled={disabled} type="button" variant="outline">
        Issue parts invoice
      </Button>
      <Button disabled={disabled} type="button" variant="outline">
        Print document
      </Button>
    </div>
  );
}
