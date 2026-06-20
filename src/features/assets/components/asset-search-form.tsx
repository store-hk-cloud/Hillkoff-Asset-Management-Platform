"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ASSET_CATEGORIES,
  type AssetCategoryKey,
} from "@/domain/master-data/asset-categories";

type AssetSearchFormProps = Readonly<{
  query: string;
  status: string;
  categoryKey: AssetCategoryKey | "all";
}>;

type AssetSuggestion = {
  readonly id: string;
  readonly assetCode: string;
  readonly name: string;
  readonly serialNumber: string | null;
};

export function AssetSearchForm({
  query,
  status,
  categoryKey,
}: AssetSearchFormProps) {
  const { locale, t } = useLanguage();
  const [searchValue, setSearchValue] = useState(query);
  const [suggestions, setSuggestions] = useState<readonly AssetSuggestion[]>(
    [],
  );

  useEffect(() => {
    const normalized = searchValue.trim();
    if (normalized.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({
        query: normalized,
        status,
        categoryKey,
        limit: "10",
      });
      try {
        const response = await fetch(`/api/assets?${params}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          data?: readonly AssetSuggestion[];
        };
        setSuggestions(response.ok ? (payload.data ?? []) : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [categoryKey, searchValue, status]);

  return (
    <form
      action="/assets"
      className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_180px_180px_auto]"
      method="get"
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-3 left-3 size-4"
        />
        <Input
          className="pl-9"
          name="query"
          onChange={(event) => setSearchValue(event.currentTarget.value)}
          placeholder={
            locale === "th"
              ? "ค้นหารหัส ชื่อ หมวดหมู่ Serial หรือสถานที่"
              : "Search code, name, category, serial, or location"
          }
          value={searchValue}
        />
        {searchValue.trim().length >= 2 && suggestions.length > 0 ? (
          <div className="bg-popover absolute z-20 mt-1 w-full overflow-hidden rounded-md border shadow-md">
            {suggestions.map((asset) => (
              <Link
                className="hover:bg-accent block px-3 py-2 text-sm"
                href={`/assets/${asset.id}`}
                key={asset.id}
              >
                <span className="font-medium">{asset.name}</span>
                <span className="text-muted-foreground ml-2 font-mono text-xs">
                  {asset.assetCode} · {asset.serialNumber ?? "—"}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
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
      <select
        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        defaultValue={categoryKey}
        name="categoryKey"
      >
        <option value="all">
          {locale === "th" ? "ทุกหมวดหมู่" : "All categories"}
        </option>
        {ASSET_CATEGORIES.map((category) => (
          <option key={category.key} value={category.key}>
            {locale === "th" ? category.nameTh : category.nameEn}
          </option>
        ))}
      </select>
      <Button type="submit">{t("action.search")}</Button>
    </form>
  );
}
