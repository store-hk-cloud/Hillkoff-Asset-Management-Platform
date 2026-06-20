"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import type { PmChecklistItem } from "@/domain/entities/pm-job";
import { completePm } from "@/features/pm/services/pm-api.service";

type Props = Readonly<{
  pmId: string;
  version: number;
  initialChecklist: readonly PmChecklistItem[];
}>;

export function PmCompletionForm({ pmId, version, initialChecklist }: Props) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [checklist, setChecklist] = useState([...initialChecklist]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await completePm(pmId, {
        expectedVersion: version,
        checklist,
        completionNotes: data.get("completionNotes"),
      });
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถปิดงาน PM ได้",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div className="space-y-3">
        {checklist.map((item, index) => (
          <div className="rounded-lg border p-3" key={item.id}>
            <label className="flex min-h-10 items-start gap-3">
              <input
                checked={item.completed}
                className="mt-1 size-5"
                onChange={(event) =>
                  setChecklist((current) =>
                    current.map((value, itemIndex) =>
                      itemIndex === index
                        ? { ...value, completed: event.target.checked }
                        : value,
                    ),
                  )
                }
                type="checkbox"
              />
              <span className="text-sm">{item.label}</span>
            </label>
            <input
              aria-label={`${locale === "th" ? "หมายเหตุ" : "Notes"} ${item.label}`}
              className="border-input bg-background mt-2 h-10 w-full rounded-md border px-3 text-sm"
              onChange={(event) =>
                setChecklist((current) =>
                  current.map((value, itemIndex) =>
                    itemIndex === index
                      ? { ...value, notes: event.target.value }
                      : value,
                  ),
                )
              }
              placeholder={locale === "th" ? "หมายเหตุรายการนี้" : "Item notes"}
              value={item.notes}
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="completionNotes">
          {locale === "th" ? "หมายเหตุการปิดงาน" : "Completion Notes"}
        </Label>
        <textarea
          className="border-input bg-background min-h-28 w-full rounded-md border px-3 py-2 text-sm"
          id="completionNotes"
          maxLength={3000}
          name="completionNotes"
        />
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="h-12 w-full" disabled={busy} type="submit">
        {busy
          ? t("status.loading")
          : locale === "th"
            ? "ปิดงาน PM"
            : "Complete PM"}
      </Button>
    </form>
  );
}
