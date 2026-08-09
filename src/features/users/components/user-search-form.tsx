"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLanguage } from "@/components/providers/language-provider";
import { USER_ROLES } from "@/domain/value-objects/user-role";

export function UserSearchForm({
  query,
  role,
  status,
}: Readonly<{ query: string; role: string; status: string }>) {
  const { locale, t } = useLanguage();

  return (
    <form
      action="/users"
      className="bg-card grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_160px_160px_auto]"
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
            locale === "th" ? "ค้นหาชื่อหรืออีเมล" : "Search name or email"
          }
        />
      </div>
      <Select
        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        defaultValue={role}
        name="role"
      >
        <option value="all">{locale === "th" ? "ทุกบทบาท" : "All roles"}</option>
        {USER_ROLES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
      <Select
        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        defaultValue={status}
        name="status"
      >
        <option value="all">{locale === "th" ? "ทุกสถานะ" : "All status"}</option>
        <option value="active">
          {locale === "th" ? "ใช้งานอยู่" : "Active"}
        </option>
        <option value="invited">
          {locale === "th" ? "รอตั้งรหัสผ่าน" : "Invited"}
        </option>
        <option value="disabled">
          {locale === "th" ? "ปิดใช้งาน" : "Disabled"}
        </option>
      </Select>
      <Button type="submit">{t("action.search")}</Button>
    </form>
  );
}
