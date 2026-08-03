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
        ออกใบแจ้งหนี้ค่าบริการช่าง / Issue technician service invoice
      </Button>
      <Button disabled={disabled} type="button" variant="outline">
        ออกใบแจ้งหนี้ค่าอะไหล่ / Issue parts invoice
      </Button>
      <Button disabled={disabled} type="button" variant="outline">
        พิมพ์เอกสาร / Print document
      </Button>
    </div>
  );
}
