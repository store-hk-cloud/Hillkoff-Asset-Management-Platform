"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRepairTicket } from "@/features/repairs/services/repair-api.service";

export function CreateRepairForm() {
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
        <Label htmlFor="assetCode">Asset Code</Label>
        <Input id="assetCode" name="assetCode" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">หัวข้อปัญหา</Label>
        <Input id="title" maxLength={200} name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">รายละเอียดอาการ</Label>
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
        {busy ? "กำลังสร้าง…" : "Create Repair Ticket"}
      </Button>
    </form>
  );
}
