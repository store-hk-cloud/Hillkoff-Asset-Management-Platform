"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useLanguage } from "@/components/providers/language-provider";
import { createRepairSchema } from "@/features/repairs/schemas/repair.schema";
import { createRepairTicket } from "@/features/repairs/services/repair-api.service";
import {
  getFieldErrors,
  type FieldErrors,
} from "@/lib/validation/field-errors";

export function CreateRepairForm() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});
    const payload = {
      assetCode: data.get("assetCode"),
      title: data.get("title"),
      description: data.get("description"),
    };
    const validation = createRepairSchema.safeParse(payload);
    if (!validation.success) {
      setFieldErrors(getFieldErrors(validation.error));
      return;
    }

    setBusy(true);
    try {
      const result = await createRepairTicket(validation.data);
      router.replace(`/repairs/${String(result.id)}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถสร้าง Repair Ticket ได้",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <FormField
        error={fieldErrors.assetCode}
        htmlFor="assetCode"
        label={
          locale === "th"
            ? "Serial Number / Machine ID / รหัสเครื่อง"
            : "Serial number / Machine ID / Machine code"
        }
        required
      >
        <Input
          id="assetCode"
          name="assetCode"
          placeholder={
            locale === "th"
              ? "แนะนำให้ใช้ Serial Number"
              : "Serial number is recommended"
          }
          required
        />
      </FormField>
      <FormField
        error={fieldErrors.title}
        htmlFor="title"
        label={locale === "th" ? "หัวข้อปัญหา" : "Issue title"}
        required
      >
        <Input id="title" maxLength={200} name="title" required />
      </FormField>
      <FormField
        error={fieldErrors.description}
        htmlFor="description"
        label={locale === "th" ? "รายละเอียดอาการ" : "Problem description"}
        required
      >
        <Textarea
          className="min-h-32"
          id="description"
          maxLength={3000}
          name="description"
          required
        />
      </FormField>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="h-12 w-full sm:w-auto" disabled={busy} type="submit">
        {busy ? t("status.loading") : t("repairs.create")}
      </Button>
    </form>
  );
}
