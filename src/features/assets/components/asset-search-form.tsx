import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssetSearchFormProps = Readonly<{
  query: string;
  status: string;
}>;

export function AssetSearchForm({ query, status }: AssetSearchFormProps) {
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
          placeholder="ค้นหารหัส ชื่อ หมวดหมู่ Serial หรือสถานที่"
        />
      </div>
      <select
        className="border-input bg-background h-10 rounded-md border px-3 text-sm"
        defaultValue={status}
        name="status"
      >
        <option value="active">ใช้งานอยู่</option>
        <option value="archived">Archived</option>
        <option value="all">ทั้งหมด</option>
      </select>
      <Button type="submit">ค้นหา</Button>
    </form>
  );
}
