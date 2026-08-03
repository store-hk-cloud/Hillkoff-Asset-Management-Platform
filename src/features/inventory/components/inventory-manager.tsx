"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useLanguage } from "@/components/providers/language-provider";
import type { InventoryPart } from "@/domain/entities/inventory";
import { thaiPrimary } from "@/lib/i18n/thai-primary";

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
    throw new Error(
      payload.error?.message ??
        "ดำเนินการคลังอะไหล่ไม่สำเร็จ / Inventory operation failed.",
    );
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
      setError(
        submitError instanceof Error
          ? submitError.message
          : thaiPrimary(
              locale,
              "สร้างอะไหล่ไม่สำเร็จ",
              "Unable to create part.",
            ),
      );
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
      setError(
        submitError instanceof Error
          ? submitError.message
          : thaiPrimary(
              locale,
              "บันทึกการเคลื่อนไหวไม่สำเร็จ",
              "Unable to record movement.",
            ),
      );
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
      setError(
        submitError instanceof Error
          ? submitError.message
          : thaiPrimary(
              locale,
              "แก้ไขอะไหล่ไม่สำเร็จ",
              "Unable to update part.",
            ),
      );
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
      setError(
        submitError instanceof Error
          ? submitError.message
          : thaiPrimary(
              locale,
              "ปิดใช้งานอะไหล่ไม่สำเร็จ",
              "Unable to deactivate part.",
            ),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!canWrite) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="space-y-4 rounded-lg border p-4" onSubmit={create}>
        <h2 className="font-semibold">
          {thaiPrimary(locale, "สร้างอะไหล่", "Create part")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={thaiPrimary(locale, "รหัสอะไหล่", "Part number")}
            name="partNumber"
            required
          />
          <Field
            label={thaiPrimary(locale, "ชื่ออะไหล่", "Part name")}
            name="name"
            required
          />
          <Field
            label={thaiPrimary(locale, "หน่วย", "Unit")}
            name="unit"
            placeholder={thaiPrimary(locale, "ชิ้น", "piece")}
            required
          />
          <Field
            label={thaiPrimary(locale, "จุดสั่งซื้อซ้ำ", "Reorder point")}
            min="0"
            name="reorderPoint"
            required
            type="number"
          />
          <Field
            label={thaiPrimary(locale, "ต้นทุนต่อหน่วย", "Unit cost")}
            min="0"
            name="unitCost"
            required
            step="0.01"
            type="number"
          />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">
              {thaiPrimary(locale, "รายละเอียด", "Description")}
            </Label>
            <Input id="description" name="description" />
          </div>
        </div>
        <Button disabled={busy} type="submit">
          {thaiPrimary(locale, "สร้างอะไหล่", "Create part")}
        </Button>
      </form>

      <form className="space-y-4 rounded-lg border p-4" onSubmit={move}>
        <h2 className="font-semibold">
          {thaiPrimary(locale, "การเคลื่อนไหวสต็อก", "Stock movement")}
        </h2>
        <div className="space-y-2">
          <Label htmlFor="partId">
            {thaiPrimary(locale, "อะไหล่", "Part")}
          </Label>
          <Select
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
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">
              {thaiPrimary(locale, "ประเภท", "Type")}
            </Label>
            <Select
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              id="type"
              name="type"
            >
              <option value="receive">รับสต็อก / Stock receive</option>
              <option value="issue">เบิกสต็อก / Stock issue</option>
              <option value="adjustment">
                ปรับยอดสต็อก (+/-) / Stock adjustment (+/-)
              </option>
            </Select>
          </div>
          <Field
            label={thaiPrimary(locale, "จำนวน", "Quantity")}
            name="quantity"
            required
            step="0.01"
            type="number"
          />
          <Field
            label={thaiPrimary(
              locale,
              "ต้นทุนต่อหน่วย (ถ้ามี)",
              "Unit cost (optional)",
            )}
            min="0"
            name="unitCost"
            step="0.01"
            type="number"
          />
          <Field
            label={thaiPrimary(locale, "หมายเหตุ", "Notes")}
            name="notes"
          />
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button disabled={busy || !selectedPart} type="submit">
          {thaiPrimary(locale, "บันทึกการเคลื่อนไหว", "Record movement")}
        </Button>
      </form>

      {selectedPart ? (
        <form
          className="space-y-4 rounded-lg border p-4 lg:col-span-2"
          key={`${selectedPart.id}-${selectedPart.version}`}
          onSubmit={update}
        >
          <h2 className="font-semibold">
            {locale === "th"
              ? "แก้ไข / ปิดใช้งานอะไหล่"
              : thaiPrimary(
                  locale,
                  "แก้ไข / ปิดใช้งานอะไหล่",
                  "Edit / deactivate part",
                )}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              defaultValue={selectedPart.partNumber}
              label={thaiPrimary(locale, "รหัสอะไหล่", "Part number")}
              name="editPartNumber"
              required
            />
            <Field
              defaultValue={selectedPart.name}
              label={thaiPrimary(locale, "ชื่อ", "Name")}
              name="editName"
              required
            />
            <Field
              defaultValue={selectedPart.unit}
              label={thaiPrimary(locale, "หน่วย", "Unit")}
              name="editUnit"
              required
            />
            <Field
              defaultValue={selectedPart.reorderPoint}
              label={thaiPrimary(locale, "จุดสั่งซื้อซ้ำ", "Reorder point")}
              min="0"
              name="editReorderPoint"
              type="number"
            />
            <Field
              defaultValue={selectedPart.unitCost}
              label={thaiPrimary(locale, "ต้นทุนต่อหน่วย", "Unit cost")}
              min="0"
              name="editUnitCost"
              step="0.01"
              type="number"
            />
            <Field
              defaultValue={selectedPart.description}
              label={thaiPrimary(locale, "รายละเอียด", "Description")}
              name="editDescription"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={busy} type="submit">
              {thaiPrimary(locale, "อัปเดตอะไหล่", "Update part")}
            </Button>
            <Button
              disabled={busy || !selectedPart.active}
              onClick={deactivate}
              type="button"
              variant="destructive"
            >
              {thaiPrimary(locale, "ปิดใช้งานอะไหล่", "Deactivate part")}
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
