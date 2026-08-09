"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { OfflineWorkStatus } from "@/features/technician/components/offline-work-status";
import {
  clearOfflineFiles,
  deleteOfflineDraft,
  loadOfflineDraft,
  queueOfflineFiles,
  saveOfflinePayload,
} from "@/features/technician/services/offline-work.service";
import { thaiPrimary } from "@/lib/i18n/thai-primary";

const NEXT_STATUSES: Record<RepairStatus, readonly RepairStatus[]> = {
  new: [],
  assigned: ["in_progress"],
  in_progress: ["waiting_parts", "completed"],
  waiting_parts: ["in_progress", "completed"],
  completed: ["closed"],
  closed: [],
};

const STATUS_LABELS: Record<RepairStatus, string> = {
  new: "ใหม่ / New",
  assigned: "มอบหมายแล้ว / Assigned",
  in_progress: "กำลังซ่อม / In progress",
  waiting_parts: "รออะไหล่ / Waiting parts",
  completed: "เสร็จสิ้น / Completed",
  closed: "ปิดงานแล้ว / Closed",
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
  initialWarrantyClaim: boolean;
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
  initialWarrantyClaim,
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
  const [pendingFiles, setPendingFiles] = useState(0);
  const draftKey = `repair:${repairId}`;

  useEffect(() => {
    let active = true;
    async function flush() {
      const draft = await loadOfflineDraft<{
        photos: readonly UploadedRepairPhoto[];
      }>(draftKey);
      if (!active || !draft) return;
      setPhotos([...draft.payload.photos]);
      setPendingFiles(draft.files.length);
      if (!navigator.onLine || draft.files.length === 0) return;
      const uploaded: UploadedRepairPhoto[] = [];
      for (const file of draft.files) {
        uploaded.push(await uploadRepairPhoto(repairId, file));
      }
      if (!active) return;
      setPhotos((current) => {
        const nextPhotos = [...current, ...uploaded];
        void saveOfflinePayload(draftKey, { photos: nextPhotos });
        return nextPhotos;
      });
      await clearOfflineFiles(draftKey);
      setPendingFiles(0);
    }
    void flush().catch((reason: unknown) =>
      setError(
        reason instanceof Error
          ? reason.message
          : thaiPrimary(locale, "ซิงก์รูปภาพไม่สำเร็จ", "Photo sync failed."),
      ),
    );
    window.addEventListener("online", flush);
    return () => {
      active = false;
      window.removeEventListener("online", flush);
    };
  }, [draftKey, locale, repairId]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    if (!navigator.onLine) {
      const count = await queueOfflineFiles(draftKey, files, { photos });
      setPendingFiles(count);
      event.target.value = "";
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded: UploadedRepairPhoto[] = [];
      for (const file of files) {
        uploaded.push(await uploadRepairPhoto(repairId, file));
      }
      setPhotos((current) => {
        const nextPhotos = [...current, ...uploaded];
        void saveOfflinePayload(draftKey, { photos: nextPhotos });
        return nextPhotos;
      });
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
      current.map((part, partIndex) => {
        if (partIndex !== index) return part;
        if (field === "quantity" || field === "unitCost") {
          const parsed = Number(value);
          return {
            ...part,
            [field]: Number.isFinite(parsed) ? parsed : part[field],
          };
        }
        return { ...part, [field]: value };
      }),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    if (parts.some((part) => !(part.quantity > 0) || !(part.unitCost >= 0))) {
      setError(
        thaiPrimary(
          locale,
          "จำนวนอะไหล่ต้องมากกว่า 0 และต้นทุนต้องไม่ติดลบ",
          "Part quantity must be greater than 0 and cost cannot be negative.",
        ),
      );
      return;
    }
    setBusy(true);
    try {
      const result = await updateRepairTicket(repairId, {
        expectedVersion: version,
        targetStatus: targetStatus || null,
        photos,
        warrantyClaim: data.get("warrantyClaim") === "on",
        rootCause: data.get("rootCause"),
        solution: data.get("solution"),
        laborCost: Number(data.get("laborCost")),
        partsUsed: parts,
      });
      await deleteOfflineDraft(draftKey);
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
      <OfflineWorkStatus pendingFiles={pendingFiles} />
      <section className="space-y-3">
        <h2 className="font-semibold">
          {thaiPrimary(locale, "รูปภาพงานซ่อม", "Repair photos")}
        </h2>
        <Label
          className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md border"
          htmlFor="repairPhotos"
        >
          <Camera aria-hidden="true" className="size-4" />
          {thaiPrimary(locale, "ถ่ายหรือเลือกรูป", "Take or choose photos")}
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
          {thaiPrimary(locale, "แนบแล้ว", "Attached")} {photos.length}{" "}
          {thaiPrimary(locale, "รูป", "photos")}
        </p>
      </section>

      <section className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="rootCause">
            {thaiPrimary(locale, "สาเหตุหลัก", "Root cause")}
          </Label>
          <Textarea
            className="border-input bg-background min-h-28 w-full rounded-md border px-3 py-2 text-sm"
            defaultValue={initialRootCause}
            id="rootCause"
            maxLength={3000}
            name="rootCause"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="solution">
            {thaiPrimary(locale, "วิธีแก้ไข", "Solution")}
          </Label>
          <Textarea
            className="border-input bg-background min-h-32 w-full rounded-md border px-3 py-2 text-sm"
            defaultValue={initialSolution}
            id="solution"
            maxLength={5000}
            name="solution"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="laborCost">
            {thaiPrimary(locale, "ค่าแรง (บาท)", "Labor cost (THB)")}
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
        <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
          <input
            className="mt-1"
            defaultChecked={initialWarrantyClaim}
            name="warrantyClaim"
            type="checkbox"
          />
          <span>
            <span className="block font-medium">
              {thaiPrimary(locale, "ขอเคลมประกัน", "Warranty claim")}
            </span>
            <span className="text-muted-foreground block">
              {locale === "th"
                ? "ระบบจะตรวจสถานะประกันเมื่อปิดงานซ่อม"
                : thaiPrimary(
                    locale,
                    "ระบบจะตรวจสถานะประกันเมื่อปิดงานซ่อม",
                    "The system checks warranty status when the repair is completed.",
                  )}
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">
            {thaiPrimary(locale, "อะไหล่ที่ใช้", "Parts used")}
          </h2>
          <Button onClick={addPart} size="sm" type="button" variant="outline">
            <Plus aria-hidden="true" className="size-4" />
            {thaiPrimary(locale, "เพิ่มอะไหล่", "Add part")}
          </Button>
        </div>
        {parts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {thaiPrimary(locale, "ไม่ได้ใช้อะไหล่", "No parts used")}
          </p>
        ) : (
          <div className="space-y-4">
            {parts.map((part, index) => (
              <div
                className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
                key={part.id}
              >
                <Input
                  aria-label={thaiPrimary(locale, "รหัสอะไหล่", "Part number")}
                  onChange={(event) =>
                    updatePart(index, "partNumber", event.target.value)
                  }
                  placeholder={thaiPrimary(locale, "รหัสอะไหล่", "Part number")}
                  value={part.partNumber}
                />
                <Input
                  aria-label={thaiPrimary(locale, "ชื่ออะไหล่", "Part name")}
                  onChange={(event) =>
                    updatePart(index, "name", event.target.value)
                  }
                  placeholder={thaiPrimary(locale, "ชื่ออะไหล่", "Part name")}
                  required
                  value={part.name}
                />
                <Input
                  aria-label={thaiPrimary(locale, "จำนวน", "Quantity")}
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
                    aria-label={thaiPrimary(
                      locale,
                      "ต้นทุนต่อหน่วย",
                      "Unit cost",
                    )}
                    min="0"
                    onChange={(event) =>
                      updatePart(index, "unitCost", event.target.value)
                    }
                    step="0.01"
                    type="number"
                    value={part.unitCost}
                  />
                  <Button
                    aria-label={thaiPrimary(locale, "ลบอะไหล่", "Remove part")}
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
            {thaiPrimary(locale, "เปลี่ยนสถานะ", "Change status")}
          </Label>
          <Select
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
                : thaiPrimary(
                    locale,
                    "บันทึกข้อมูลโดยไม่เปลี่ยนสถานะ",
                    "Save without changing status",
                  )}
            </option>
            {NEXT_STATUSES[status].map((nextStatus) => (
              <option key={nextStatus} value={nextStatus}>
                {STATUS_LABELS[nextStatus]}
              </option>
            ))}
          </Select>
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
          : thaiPrimary(locale, "บันทึกงานซ่อม", "Save repair")}
      </Button>
    </form>
  );
}
