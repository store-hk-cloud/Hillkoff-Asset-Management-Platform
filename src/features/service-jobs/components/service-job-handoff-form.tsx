"use client";
import { Button } from "@/components/ui/button";
export function ServiceJobHandoffForm() {
  return (
    <form className="space-y-3">
      <label className="grid gap-2 text-sm">
        Customer signature file
        <input accept="image/png" className="input" type="file" />
      </label>
      <label className="grid gap-2 text-sm">
        Override reason
        <textarea className="input" maxLength={1000} />
      </label>
      <Button type="submit">Complete handoff</Button>
    </form>
  );
}
