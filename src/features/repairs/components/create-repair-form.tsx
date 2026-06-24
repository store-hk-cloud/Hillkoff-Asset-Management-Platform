"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import { createRepairTicket } from "@/features/repairs/services/repair-api.service";

export function CreateRepairForm() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const result = await createRepairTicket({
        assetCode: data.get("assetCode"),
        title: data.get("title"),
        description: data.get("description"),
      });
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
      <div className="space-y-2">
        <Label htmlFor="assetCode">
          {locale === "th"
            ? "Serial Number / Asset ID / รหัสทรัพย์สิน"
            : "Serial number / Asset ID / Asset code"}
        </Label>
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">
          {locale === "th" ? "หัวข้อปัญหา" : "Issue title"}
        </Label>
        <Input id="title" maxLength={200} name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">
          {locale === "th" ? "รายละเอียดอาการ" : "Problem description"}
        </Label>
        <textarea
          className="border-input bg-background min-h-32 w-full rounded-md border px-3 py-2 text-sm"
          id="description"
          maxLength={3000}
          name="description"
          required
        />
      </div>
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
