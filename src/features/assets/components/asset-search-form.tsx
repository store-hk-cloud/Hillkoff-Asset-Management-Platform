"use client";

import { Search } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssetSearchFormProps = Readonly<{
  query: string;
  status: string;
}>;

export function AssetSearchForm({ query, status }: AssetSearchFormProps) {
  const { locale, t } = useLanguage();

  return (
    <form
      action="/assets"
      className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_180px_auto]"
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
              ? "ค้นหารหัส ชื่อ หมวดหมู่ Serial หรือสถานที่"
              : "Search code, name, category, serial, or location"
          }
        />
      </div>
      <select
        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        defaultValue={status}
        name="status"
      >
        <option value="active">
          {locale === "th" ? "ใช้งานอยู่" : "Active"}
        </option>
        <option value="archived">
          {locale === "th" ? "เก็บถาวร" : "Archived"}
        </option>
        <option value="all">{locale === "th" ? "ทั้งหมด" : "All"}</option>
      </select>
      <Button type="submit">{t("action.search")}</Button>
    </form>
  );
}
