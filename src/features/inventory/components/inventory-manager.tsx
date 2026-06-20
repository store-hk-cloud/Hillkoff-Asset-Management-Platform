"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import type { InventoryPart } from "@/domain/entities/inventory";

async function mutate(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
) {
  const csrfResponse = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Inventory operation failed.");
  }
}

export function InventoryManager({
  parts,
  canWrite,
}: Readonly<{ parts: readonly InventoryPart[]; canWrite: boolean }>) {
  const { locale } = useLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState(parts[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedPart = parts.find((part) => part.id === selected);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await mutate("/api/inventory/parts", "POST", {
        partNumber: data.get("partNumber"),
        name: data.get("name"),
        description: data.get("description"),
        unit: data.get("unit"),
        reorderPoint: Number(data.get("reorderPoint")),
        unitCost: Number(data.get("unitCost")),
      });
      event.currentTarget.reset();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function move(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPart) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await mutate("/api/inventory/movements", "POST", {
        partId: selectedPart.id,
        type: data.get("type"),
        quantity: Number(data.get("quantity")),
        unitCost:
          String(data.get("unitCost") ?? "").trim() === ""
            ? null
            : Number(data.get("unitCost")),
        notes: data.get("notes"),
        expectedVersion: selectedPart.version,
      });
      event.currentTarget.reset();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPart) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await mutate(`/api/inventory/parts/${selectedPart.id}`, "PATCH", {
        partNumber: data.get("editPartNumber"),
        name: data.get("editName"),
        description: data.get("editDescription"),
        unit: data.get("editUnit"),
        reorderPoint: Number(data.get("editReorderPoint")),
        unitCost: Number(data.get("editUnitCost")),
        expectedVersion: selectedPart.version,
      });
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    if (!selectedPart) return;
    setBusy(true);
    try {
      await mutate(`/api/inventory/parts/${selectedPart.id}`, "DELETE", {
        expectedVersion: selectedPart.version,
      });
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!canWrite) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="space-y-4 rounded-xl border p-4" onSubmit={create}>
        <h2 className="font-semibold">
          {locale === "th" ? "สร้างอะไหล่" : "Create Part"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={locale === "th" ? "รหัสอะไหล่" : "Part Number"}
            name="partNumber"
            required
          />
          <Field
            label={locale === "th" ? "ชื่ออะไหล่" : "Part Name"}
            name="name"
            required
          />
          <Field
            label={locale === "th" ? "หน่วย" : "Unit"}
            name="unit"
            placeholder={locale === "th" ? "ชิ้น" : "piece"}
            required
          />
          <Field
            label={locale === "th" ? "จุดสั่งซื้อซ้ำ" : "Reorder Point"}
            min="0"
            name="reorderPoint"
            required
            type="number"
          />
          <Field
            label={locale === "th" ? "ต้นทุนต่อหน่วย" : "Unit Cost"}
            min="0"
            name="unitCost"
            required
            step="0.01"
            type="number"
          />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">
              {locale === "th" ? "รายละเอียด" : "Description"}
            </Label>
            <Input id="description" name="description" />
          </div>
        </div>
        <Button disabled={busy} type="submit">
          {locale === "th" ? "สร้างอะไหล่" : "Create Part"}
        </Button>
      </form>

      <form className="space-y-4 rounded-xl border p-4" onSubmit={move}>
        <h2 className="font-semibold">
          {locale === "th" ? "การเคลื่อนไหวสต็อก" : "Stock Movement"}
        </h2>
        <div className="space-y-2">
          <Label htmlFor="partId">{locale === "th" ? "อะไหล่" : "Part"}</Label>
          <select
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
            id="partId"
            onChange={(event) => setSelected(event.target.value)}
            value={selected}
          >
            {parts.map((part) => (
              <option key={part.id} value={part.id}>
                {part.partNumber} · {part.name} ({part.quantityOnHand})
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">{locale === "th" ? "ประเภท" : "Type"}</Label>
            <select
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              id="type"
              name="type"
            >
              <option value="receive">
                {locale === "th" ? "รับสต็อก" : "Stock Receive"}
              </option>
              <option value="issue">
                {locale === "th" ? "เบิกสต็อก" : "Stock Issue"}
              </option>
              <option value="adjustment">
                {locale === "th"
                  ? "ปรับยอดสต็อก (+/-)"
                  : "Stock Adjustment (+/-)"}
              </option>
            </select>
          </div>
          <Field
            label={locale === "th" ? "จำนวน" : "Quantity"}
            name="quantity"
            required
            step="0.01"
            type="number"
          />
          <Field
            label={
              locale === "th"
                ? "ต้นทุนต่อหน่วย (ถ้ามี)"
                : "Unit Cost (optional)"
            }
            min="0"
            name="unitCost"
            step="0.01"
            type="number"
          />
          <Field label={locale === "th" ? "หมายเหตุ" : "Notes"} name="notes" />
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button disabled={busy || !selectedPart} type="submit">
          {locale === "th" ? "บันทึกการเคลื่อนไหว" : "Record Movement"}
        </Button>
      </form>

      {selectedPart ? (
        <form
          className="space-y-4 rounded-xl border p-4 lg:col-span-2"
          key={`${selectedPart.id}-${selectedPart.version}`}
          onSubmit={update}
        >
          <h2 className="font-semibold">
            {locale === "th"
              ? "แก้ไข / ปิดใช้งานอะไหล่"
              : "Edit / Deactivate Part"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              defaultValue={selectedPart.partNumber}
              label={locale === "th" ? "รหัสอะไหล่" : "Part Number"}
              name="editPartNumber"
              required
            />
            <Field
              defaultValue={selectedPart.name}
              label={locale === "th" ? "ชื่อ" : "Name"}
              name="editName"
              required
            />
            <Field
              defaultValue={selectedPart.unit}
              label={locale === "th" ? "หน่วย" : "Unit"}
              name="editUnit"
              required
            />
            <Field
              defaultValue={selectedPart.reorderPoint}
              label={locale === "th" ? "จุดสั่งซื้อซ้ำ" : "Reorder Point"}
              min="0"
              name="editReorderPoint"
              type="number"
            />
            <Field
              defaultValue={selectedPart.unitCost}
              label={locale === "th" ? "ต้นทุนต่อหน่วย" : "Unit Cost"}
              min="0"
              name="editUnitCost"
              step="0.01"
              type="number"
            />
            <Field
              defaultValue={selectedPart.description}
              label={locale === "th" ? "รายละเอียด" : "Description"}
              name="editDescription"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={busy} type="submit">
              {locale === "th" ? "อัปเดตอะไหล่" : "Update Part"}
            </Button>
            <Button
              disabled={busy || !selectedPart.active}
              onClick={deactivate}
              type="button"
              variant="destructive"
            >
              {locale === "th" ? "ปิดใช้งานอะไหล่" : "Deactivate Part"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
