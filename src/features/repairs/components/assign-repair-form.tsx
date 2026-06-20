"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import { assignRepairTicket } from "@/features/repairs/services/repair-api.service";
import { TechnicianSelect } from "@/features/technician/components/technician-select";

type AssignRepairFormProps = Readonly<{
  repairId: string;
  version: number;
}>;

export function AssignRepairForm({ repairId, version }: AssignRepairFormProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [technicianName, setTechnicianName] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await assignRepairTicket(repairId, {
        expectedVersion: version,
        technicianId: data.get("technicianId"),
        technicianName: data.get("technicianName"),
      });
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถมอบหมายช่างได้",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="technicianId">
          {locale === "th" ? "รหัสผู้ใช้ของช่าง" : "Technician User ID"}
        </Label>
        <TechnicianSelect
          id="technicianId"
          name="technicianId"
          onTechnicianChange={(technician) =>
            setTechnicianName(technician?.displayName ?? "")
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="technicianName">
          {locale === "th" ? "ชื่อช่าง" : "Technician name"}
        </Label>
        <Input
          id="technicianName"
          name="technicianName"
          readOnly
          required
          value={technicianName}
        />
      </div>
      {error ? (
        <p className="text-destructive text-sm sm:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        className="h-12 w-full sm:col-span-2 sm:w-auto"
        disabled={busy}
        type="submit"
      >
        {busy
          ? t("status.loading")
          : locale === "th"
            ? "มอบหมายช่าง"
            : "Assign Technician"}
      </Button>
    </form>
  );
}
