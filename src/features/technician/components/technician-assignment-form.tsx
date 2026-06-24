"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TechnicianWorkType } from "@/domain/entities/technician-work";
import { TechnicianSelect } from "@/features/technician/components/technician-select";
import { assignTechnicianWork } from "@/features/technician/services/technician-api.service";

export function TechnicianAssignmentForm({
  type,
  workId,
  version,
}: {
  type: TechnicianWorkType;
  workId: string;
  version: number;
}) {
  const { locale } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await assignTechnicianWork(type, workId, {
        expectedVersion: version,
        technicianId: data.get("technicianId"),
      });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Assignment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <Label htmlFor={`technician-${type}-${workId}`}>
        {locale === "th" ? "เลือกช่างผู้รับผิดชอบ" : "Select technician"}
      </Label>
      <TechnicianSelect
        id={`technician-${type}-${workId}`}
        name="technicianId"
      />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button disabled={busy} type="submit">
        {locale === "th" ? "มอบหมายงาน" : "Assign work"}
      </Button>
    </form>
  );
}
