"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useLanguage } from "@/components/providers/language-provider";
import {
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
} from "@/domain/entities/notification";

export function NotificationSearchForm({
  status,
  type,
}: Readonly<{ status: string; type: string }>) {
  const { locale, t } = useLanguage();

  return (
    <form
      action="/notifications"
      className="bg-card grid gap-3 rounded-lg border p-4 sm:grid-cols-[180px_180px_auto]"
      method="get"
    >
      <Select
        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        defaultValue={status}
        name="status"
      >
        <option value="all">{locale === "th" ? "ทุกสถานะ" : "All status"}</option>
        {NOTIFICATION_STATUSES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
      <Select
        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        defaultValue={type}
        name="type"
      >
        <option value="all">{locale === "th" ? "ทุกประเภท" : "All types"}</option>
        {NOTIFICATION_TYPES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
      <Button type="submit">{t("action.search")}</Button>
    </form>
  );
}
