"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useLanguage } from "@/components/providers/language-provider";

export function MovementSearchForm({ type }: Readonly<{ type: string }>) {
  const { locale, t } = useLanguage();

  return (
    <form
      action="/warehouse/movements"
      className="flex flex-col gap-3 sm:flex-row"
      method="get"
    >
      <Select
        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        defaultValue={type}
        name="type"
      >
        <option value="all">
          {locale === "th" ? "ทุกการเคลื่อนไหว" : "All movements"}
        </option>
        <option value="warehouse_movement">{t("warehouse.transfer")}</option>
        <option value="customer_sale">{t("warehouse.sale")}</option>
      </Select>
      <Button type="submit">
        {locale === "th" ? "กรองรายการ" : "Apply filter"}
      </Button>
    </form>
  );
}
