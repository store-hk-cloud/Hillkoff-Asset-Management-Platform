"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLanguage } from "@/components/providers/language-provider";

export function InventorySearchForm({
  query,
  status,
}: Readonly<{ query: string; status: string }>) {
  const { locale, t } = useLanguage();

  return (
    <form
      action="/inventory"
      className="bg-card grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_180px_auto]"
      method="get"
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-3 left-3 size-4"
        />
        <Input
          className="pl-9"
          defaultValue={query}
          name="query"
          placeholder={
            locale === "th"
              ? "ค้นหารหัสหรือชื่ออะไหล่"
              : "Search part number or name"
          }
        />
      </div>
      <Select
        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        defaultValue={status}
        name="status"
      >
        <option value="all">{locale === "th" ? "ทั้งหมด" : "All"}</option>
        <option value="low">
          {locale === "th" ? "ใกล้หมด" : "Low stock"}
        </option>
        <option value="active">
          {locale === "th" ? "ใช้งานอยู่" : "Active"}
        </option>
        <option value="inactive">
          {locale === "th" ? "ปิดใช้งาน" : "Inactive"}
        </option>
      </Select>
      <Button type="submit">{t("action.search")}</Button>
    </form>
  );
}
