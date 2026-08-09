"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useLanguage } from "@/components/providers/language-provider";

export function PmSearchForm({ status }: Readonly<{ status: string }>) {
  const { locale, t } = useLanguage();

  return (
    <form
      action="/pm"
      className="bg-card grid gap-3 rounded-lg border p-4 sm:grid-cols-[220px_auto]"
      method="get"
    >
      <Select
        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        defaultValue={status}
        name="status"
      >
        <option value="scheduled">
          {locale === "th" ? "กำลังจะถึง" : "Upcoming"}
        </option>
        <option value="completed">
          {locale === "th" ? "เสร็จสิ้นแล้ว" : "Completed"}
        </option>
        <option value="all">{locale === "th" ? "ทั้งหมด" : "All"}</option>
      </Select>
      <Button type="submit">{t("action.search")}</Button>
    </form>
  );
}
