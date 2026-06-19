"use client";

import { useState, type ComponentProps, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { schedulePm } from "@/features/pm/services/pm-api.service";

const DEFAULT_CHECKLIST = [
  "ตรวจสอบสภาพและทำความสะอาดเครื่อง",
  "ตรวจสอบระบบไฟฟ้าและจุดเชื่อมต่อ",
  "ตรวจสอบชิ้นส่วนสึกหรอ",
  "ทดสอบการทำงานหลังบำรุงรักษา",
].join("\n");

export function SchedulePmForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const recurrence = String(data.get("recurrenceMonths") ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      const result = await schedulePm({
        assetCode: data.get("assetCode"),
        title: data.get("title"),
        scheduledAt: new Date(String(data.get("scheduledAt"))).toISOString(),
        assignedTechnicianId: data.get("assignedTechnicianId"),
        assignedTechnicianName: data.get("assignedTechnicianName"),
        checklistLabels: String(data.get("checklist") ?? "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        recurrenceMonths: recurrence ? Number(recurrence) : null,
      });
      router.replace(`/pm/${String(result.id)}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถสร้าง PM Schedule ได้",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Asset Code" name="assetCode" required />
        <Field label="หัวข้องาน PM" name="title" required />
        <Field
          label="วันที่และเวลา"
          name="scheduledAt"
          required
          type="datetime-local"
        />
        <Field
          label="รอบ PM (เดือน)"
          min="1"
          name="recurrenceMonths"
          placeholder="เว้นว่างหากไม่มีรอบ"
          type="number"
        />
        <Field
          label="Technician User ID"
          name="assignedTechnicianId"
          required
        />
        <Field label="ชื่อช่าง" name="assignedTechnicianName" required />
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="checklist">PM Checklist (หนึ่งรายการต่อบรรทัด)</Label>
          <textarea
            className="border-input bg-background min-h-44 w-full rounded-md border px-3 py-2 text-sm"
            defaultValue={DEFAULT_CHECKLIST}
            id="checklist"
            name="checklist"
            required
          />
        </div>
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="h-12 w-full sm:w-auto" disabled={busy} type="submit">
        {busy ? "กำลังสร้าง…" : "Schedule PM"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
