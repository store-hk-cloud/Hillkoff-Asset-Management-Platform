"use client";

import { useState, type ComponentProps, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useLanguage } from "@/components/providers/language-provider";
import { schedulePmSchema } from "@/features/pm/schemas/pm.schema";
import { schedulePm } from "@/features/pm/services/pm-api.service";
import { TechnicianSelect } from "@/features/technician/components/technician-select";
import {
  getFieldErrors,
  type FieldErrors,
} from "@/lib/validation/field-errors";

const DEFAULT_CHECKLIST = [
  "ตรวจสอบสภาพและทำความสะอาดเครื่อง",
  "ตรวจสอบระบบไฟฟ้าและจุดเชื่อมต่อ",
  "ตรวจสอบชิ้นส่วนสึกหรอ",
  "ทดสอบการทำงานหลังบำรุงรักษา",
].join("\n");

export function SchedulePmForm() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [technicianName, setTechnicianName] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const recurrence = String(data.get("recurrenceMonths") ?? "").trim();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const scheduledLocal = String(data.get("scheduledAt"));
    const scheduledDate = new Date(scheduledLocal);
    const payload = {
      assetCode: data.get("assetCode"),
      title: data.get("title"),
      scheduledAt: Number.isNaN(scheduledDate.getTime())
        ? scheduledLocal
        : scheduledDate.toISOString(),
      assignedTechnicianId: data.get("assignedTechnicianId"),
      assignedTechnicianName: data.get("assignedTechnicianName"),
      checklistLabels: String(data.get("checklist") ?? "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      recurrenceMonths: recurrence ? Number(recurrence) : null,
    };
    const validation = schedulePmSchema.safeParse(payload);
    if (!validation.success) {
      setFieldErrors(getFieldErrors(validation.error));
      setBusy(false);
      return;
    }
    try {
      const result = await schedulePm({
        ...validation.data,
        scheduledAt: validation.data.scheduledAt.toISOString(),
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
        <Field
          label={
            locale === "th"
              ? "Serial Number / Machine ID / รหัสเครื่อง"
              : "Serial number / Machine ID / Machine code"
          }
          name="assetCode"
          error={fieldErrors.assetCode}
          required
        />
        <Field
          label={locale === "th" ? "หัวข้องาน PM" : "PM title"}
          name="title"
          error={fieldErrors.title}
          required
        />
        <Field
          label={locale === "th" ? "วันที่และเวลา" : "Date and time"}
          name="scheduledAt"
          error={fieldErrors.scheduledAt}
          required
          type="datetime-local"
        />
        <Field
          label={locale === "th" ? "รอบ PM (เดือน)" : "PM interval (months)"}
          min="1"
          name="recurrenceMonths"
          error={fieldErrors.recurrenceMonths}
          placeholder={
            locale === "th"
              ? "เว้นว่างหากไม่มีรอบ"
              : "Leave blank if not recurring"
          }
          type="number"
        />
        <div className="space-y-2">
          <Label htmlFor="assignedTechnicianId" required>
            {locale === "th" ? "ช่างผู้รับผิดชอบ" : "Assigned technician"}
          </Label>
          <TechnicianSelect
            onTechnicianChange={(technician) =>
              setTechnicianName(technician?.displayName ?? "")
            }
          />
        </div>
        <Field
          label={locale === "th" ? "ชื่อช่าง" : "Technician name"}
          name="assignedTechnicianName"
          error={fieldErrors.assignedTechnicianName}
          readOnly
          required
          value={technicianName}
        />
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="checklist">
            {locale === "th"
              ? "รายการตรวจ PM (หนึ่งรายการต่อบรรทัด)"
              : "PM checklist (one item per line)"}
          </Label>
          <Textarea
            className="min-h-44"
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
        {busy
          ? t("status.loading")
          : locale === "th"
            ? "กำหนดแผน PM"
            : "Schedule PM"}
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
  error?: string | undefined;
} & ComponentProps<typeof Input>) {
  const { error, ...inputProps } = props;
  return (
    <FormField
      error={error}
      htmlFor={name}
      label={label}
      required={Boolean(inputProps.required)}
    >
      <Input id={name} name={name} {...inputProps} />
    </FormField>
  );
}
