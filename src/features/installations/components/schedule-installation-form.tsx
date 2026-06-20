"use client";

import { useState, type ComponentProps, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import { scheduleInstallation } from "@/features/installations/services/installation-api.service";

export function ScheduleInstallationForm() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const scheduledLocal = String(data.get("scheduledAt"));

    try {
      const result = await scheduleInstallation({
        assetCode: data.get("assetCode"),
        customerId: data.get("customerId"),
        customerName: data.get("customerName"),
        address: data.get("address"),
        scheduledAt: new Date(scheduledLocal).toISOString(),
        assignedTechnicianId: data.get("assignedTechnicianId"),
        assignedTechnicianName: data.get("assignedTechnicianName"),
        warrantyMonths: Number(data.get("warrantyMonths")),
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
          label={locale === "th" ? "รหัสทรัพย์สิน" : "Asset Code"}
          name="assetCode"
          required
        />
        <Field label={t("field.customerId")} name="customerId" required />
        <Field
          label={locale === "th" ? "ชื่อลูกค้า" : "Customer name"}
          name="customerName"
          required
        />
        <Field
          label={
            locale === "th" ? "วันและเวลาติดตั้ง" : "Installation date and time"
          }
          name="scheduledAt"
          required
          type="datetime-local"
        />
        <Field
          label={locale === "th" ? "รหัสผู้ใช้ของช่าง" : "Technician User ID"}
          name="assignedTechnicianId"
          required
        />
        <Field
          label={locale === "th" ? "ชื่อช่าง" : "Technician name"}
          name="assignedTechnicianName"
          required
        />
        <Field
          defaultValue="12"
          label={locale === "th" ? "ระยะประกัน (เดือน)" : "Warranty (months)"}
          max="120"
          min="1"
          name="warrantyMonths"
          required
          type="number"
        />
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">
            {locale === "th" ? "สถานที่ติดตั้ง" : "Installation address"} *
          </Label>
          <textarea
            className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
            id="address"
            name="address"
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
} & ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
