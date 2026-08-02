"use client";

import { useState, type ComponentProps, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useLanguage } from "@/components/providers/language-provider";
import { scheduleInstallationSchema } from "@/features/installations/schemas/installation.schema";
import { scheduleInstallation } from "@/features/installations/services/installation-api.service";
import { TechnicianSelect } from "@/features/technician/components/technician-select";
import {
  getFieldErrors,
  type FieldErrors,
} from "@/lib/validation/field-errors";

export function ScheduleInstallationForm() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [technicianName, setTechnicianName] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const data = new FormData(event.currentTarget);
    const scheduledLocal = String(data.get("scheduledAt"));
    const scheduledDate = new Date(scheduledLocal);
    const payload = {
      assetCode: data.get("assetCode"),
      customerId: data.get("customerId"),
      customerName: data.get("customerName"),
      address: data.get("address"),
      scheduledAt: Number.isNaN(scheduledDate.getTime())
        ? scheduledLocal
        : scheduledDate.toISOString(),
      assignedTechnicianId: data.get("assignedTechnicianId"),
      assignedTechnicianName: data.get("assignedTechnicianName"),
      warrantyMonths: Number(data.get("warrantyMonths")),
    };
    const validation = scheduleInstallationSchema.safeParse(payload);
    if (!validation.success) {
      setFieldErrors(getFieldErrors(validation.error));
      setBusy(false);
      return;
    }

    try {
      const result = await scheduleInstallation({
        ...validation.data,
        scheduledAt: validation.data.scheduledAt.toISOString(),
      });
      router.replace(`/installations/${String(result.id)}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถนัดหมายได้",
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
          error={fieldErrors.customerId}
          label={t("field.customerId")}
          name="customerId"
          required
        />
        <Field
          label={locale === "th" ? "ชื่อลูกค้า" : "Customer name"}
          name="customerName"
          error={fieldErrors.customerName}
          required
        />
        <Field
          label={
            locale === "th" ? "วันและเวลาติดตั้ง" : "Installation date and time"
          }
          name="scheduledAt"
          error={fieldErrors.scheduledAt}
          required
          type="datetime-local"
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
        <Field
          defaultValue="12"
          label={locale === "th" ? "ระยะประกัน (เดือน)" : "Warranty (months)"}
          max="120"
          min="1"
          name="warrantyMonths"
          error={fieldErrors.warrantyMonths}
          required
          type="number"
        />
        <div className="space-y-2 sm:col-span-2">
          <FormField
            error={fieldErrors.address}
            htmlFor="address"
            label={locale === "th" ? "สถานที่ติดตั้ง" : "Installation address"}
            required
          >
            <Textarea id="address" name="address" required />
          </FormField>
        </div>
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="h-12 w-full sm:w-auto" disabled={busy} type="submit">
        {busy ? t("status.loading") : t("installations.schedule")}
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
