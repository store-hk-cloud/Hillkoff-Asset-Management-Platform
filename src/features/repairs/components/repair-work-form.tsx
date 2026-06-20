"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import type {
  RepairPartUsed,
  RepairStatus,
} from "@/domain/entities/repair-ticket";
import { updateRepairTicket } from "@/features/repairs/services/repair-api.service";
import {
  uploadRepairPhoto,
  type UploadedRepairPhoto,
} from "@/features/repairs/services/repair-storage.service";

const NEXT_STATUSES: Record<RepairStatus, readonly RepairStatus[]> = {
  new: [],
  assigned: ["in_progress"],
  in_progress: ["waiting_parts", "completed"],
  waiting_parts: ["in_progress", "completed"],
  completed: ["closed"],
  closed: [],
};

const STATUS_LABELS: Record<RepairStatus, string> = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In Progress",
  waiting_parts: "Waiting Parts",
  completed: "Completed",
  closed: "Closed",
};

type RepairWorkFormProps = Readonly<{
  repairId: string;
  initialVersion: number;
  initialStatus: RepairStatus;
  initialPhotos: readonly UploadedRepairPhoto[];
  initialRootCause: string;
  initialSolution: string;
  initialLaborCost: number;
  initialParts: readonly RepairPartUsed[];
}>;

export function RepairWorkForm({
  repairId,
  initialVersion,
  initialStatus,
  initialPhotos,
  initialRootCause,
  initialSolution,
  initialLaborCost,
  initialParts,
}: RepairWorkFormProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState(initialStatus);
  const [photos, setPhotos] = useState([...initialPhotos]);
  const [parts, setParts] = useState([...initialParts]);
  const [targetStatus, setTargetStatus] = useState<RepairStatus | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded: UploadedRepairPhoto[] = [];
      for (const file of files) {
        uploaded.push(await uploadRepairPhoto(repairId, file));
      }
      setPhotos((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปไม่ได้",
      );
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function addPart() {
    setParts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        partNumber: "",
        name: "",
        quantity: 1,
        unitCost: 0,
      },
    ]);
  }

  function updatePart(
    index: number,
    field: keyof Omit<RepairPartUsed, "id">,
    value: string,
  ) {
    setParts((current) =>
      current.map((part, partIndex) =>
        partIndex === index
          ? {
              ...part,
              [field]:
                field === "quantity" || field === "unitCost"
                  ? Number(value)
                  : value,
            }
          : part,
      ),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const result = await updateRepairTicket(repairId, {
        expectedVersion: version,
        targetStatus: targetStatus || null,
        photos,
        rootCause: data.get("rootCause"),
        solution: data.get("solution"),
        laborCost: Number(data.get("laborCost")),
        partsUsed: parts,
      });
      setVersion(Number(result.version));
      if (typeof result.status === "string") {
        setStatus(result.status as RepairStatus);
      }
      setTargetStatus("");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "บันทึกงานซ่อมไม่ได้",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-8" onSubmit={submit}>
      <section className="space-y-3">
        <h2 className="font-semibold">
          {locale === "th" ? "รูปภาพงานซ่อม" : "Repair Photos"}
        </h2>
        <Label
          className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md border"
          htmlFor="repairPhotos"
        >
          <Camera aria-hidden="true" className="size-4" />
          {locale === "th" ? "ถ่ายหรือเลือกรูป" : "Take or choose photos"}
        </Label>
        <input
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          id="repairPhotos"
          multiple
          onChange={upload}
          type="file"
        />
        <p className="text-muted-foreground text-sm">
          {locale === "th" ? "แนบแล้ว" : "Attached"} {photos.length}{" "}
          {locale === "th" ? "รูป" : "photos"}
        </p>
      </section>

      <section className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="rootCause">
            {locale === "th" ? "สาเหตุหลัก" : "Root Cause"}
          </Label>
          <textarea
            className="border-input bg-background min-h-28 w-full rounded-md border px-3 py-2 text-sm"
            defaultValue={initialRootCause}
            id="rootCause"
            maxLength={3000}
            name="rootCause"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="solution">
            {locale === "th" ? "วิธีแก้ไข" : "Solution"}
          </Label>
          <textarea
            className="border-input bg-background min-h-32 w-full rounded-md border px-3 py-2 text-sm"
            defaultValue={initialSolution}
            id="solution"
            maxLength={5000}
            name="solution"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="laborCost">
            {locale === "th" ? "ค่าแรง (บาท)" : "Labor Cost (THB)"}
          </Label>
          <Input
            defaultValue={initialLaborCost}
            id="laborCost"
            min="0"
            name="laborCost"
            step="0.01"
            type="number"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">
            {locale === "th" ? "อะไหล่ที่ใช้" : "Parts Used"}
          </h2>
          <Button onClick={addPart} size="sm" type="button" variant="outline">
            <Plus aria-hidden="true" className="size-4" />
            {locale === "th" ? "เพิ่มอะไหล่" : "Add Part"}
          </Button>
        </div>
        {parts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {locale === "th" ? "ไม่ได้ใช้อะไหล่" : "No parts used"}
          </p>
        ) : (
          <div className="space-y-4">
            {parts.map((part, index) => (
              <div
                className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
                key={part.id}
              >
                <Input
                  aria-label={locale === "th" ? "รหัสอะไหล่" : "Part number"}
                  onChange={(event) =>
                    updatePart(index, "partNumber", event.target.value)
                  }
                  placeholder={locale === "th" ? "รหัสอะไหล่" : "Part Number"}
                  value={part.partNumber}
                />
                <Input
                  aria-label={locale === "th" ? "ชื่ออะไหล่" : "Part name"}
                  onChange={(event) =>
                    updatePart(index, "name", event.target.value)
                  }
                  placeholder={locale === "th" ? "ชื่ออะไหล่" : "Part Name"}
                  required
                  value={part.name}
                />
                <Input
                  aria-label={locale === "th" ? "จำนวน" : "Quantity"}
                  min="0.01"
                  onChange={(event) =>
                    updatePart(index, "quantity", event.target.value)
                  }
                  step="0.01"
                  type="number"
                  value={part.quantity}
                />
                <div className="flex gap-2">
                  <Input
                    aria-label={
                      locale === "th" ? "ต้นทุนต่อหน่วย" : "Unit cost"
                    }
                    min="0"
                    onChange={(event) =>
                      updatePart(index, "unitCost", event.target.value)
                    }
                    step="0.01"
                    type="number"
                    value={part.unitCost}
                  />
                  <Button
                    aria-label={locale === "th" ? "ลบอะไหล่" : "Remove part"}
                    onClick={() =>
                      setParts((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {NEXT_STATUSES[status].length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor="targetStatus">
            {locale === "th" ? "เปลี่ยนสถานะ" : "Change status"}
          </Label>
          <select
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
            id="targetStatus"
            onChange={(event) =>
              setTargetStatus(event.target.value as RepairStatus | "")
            }
            value={targetStatus}
          >
            <option value="">
              {locale === "th"
                ? "บันทึกข้อมูลโดยไม่เปลี่ยนสถานะ"
                : "Save without changing status"}
            </option>
            {NEXT_STATUSES[status].map((nextStatus) => (
              <option key={nextStatus} value={nextStatus}>
                {STATUS_LABELS[nextStatus]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="h-12 w-full" disabled={busy} type="submit">
        {busy
          ? t("status.loading")
          : locale === "th"
            ? "บันทึกงานซ่อม"
            : "Save Repair"}
      </Button>
    </form>
  );
}
