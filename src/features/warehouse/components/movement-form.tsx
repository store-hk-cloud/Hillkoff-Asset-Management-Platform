"use client";

import { useRef, useState, type FormEvent } from "react";
import { ScanLine, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Asset } from "@/domain/entities/asset";
import { MovementSummary } from "@/features/warehouse/components/movement-summary";
import {
  findWarehouseAsset,
  submitMovement,
} from "@/features/warehouse/services/warehouse-api.service";

type MovementAction = "receive" | "transfer" | "sale";

type MovementFormProps = Readonly<{
  action: MovementAction;
}>;

const labels: Record<
  MovementAction,
  {
    title: string;
    destinationLabel: string;
    destinationName: "destinationBranchId" | "customerId";
    locationLabel: string;
  }
> = {
  receive: {
    title: "รับเข้าคลัง/สาขา",
    destinationLabel: "Branch ID ปลายทาง",
    destinationName: "destinationBranchId",
    locationLabel: "สถานที่รับเข้า",
  },
  transfer: {
    title: "โอนสาขา",
    destinationLabel: "Branch ID ปลายทาง",
    destinationName: "destinationBranchId",
    locationLabel: "สถานที่ปลายทาง",
  },
  sale: {
    title: "ขายลูกค้า",
    destinationLabel: "Customer ID",
    destinationName: "customerId",
    locationLabel: "สถานที่ส่งมอบ/ติดตั้ง",
  },
};

export function MovementForm({ action }: MovementFormProps) {
  const router = useRouter();
  const assetCodeInputRef = useRef<HTMLInputElement>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const config = labels[action];

  async function lookupAsset() {
    const assetCode = assetCodeInputRef.current?.value.trim();

    if (!assetCode) {
      setError("กรุณาระบุรหัสทรัพย์สิน");
      return;
    }

    setLoadingAsset(true);
    setError(null);

    try {
      setAsset(await findWarehouseAsset(assetCode));
    } catch (lookupError) {
      setAsset(null);
      setError(
        lookupError instanceof Error ? lookupError.message : "ไม่พบทรัพย์สิน",
      );
    } finally {
      setLoadingAsset(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!asset) {
      setError("ค้นหาและตรวจสอบทรัพย์สินก่อนทำรายการ");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      assetCode: asset.assetCode,
      [config.destinationName]: formData.get(config.destinationName),
      destinationLocationName: formData.get("destinationLocationName"),
      referenceNumber: formData.get("referenceNumber") || null,
      notes: formData.get("notes") ?? "",
      expectedVersion: asset.version,
    };

    setSubmitting(true);
    setError(null);

    try {
      const movement = await submitMovement(action, payload);
      router.replace(
        `/warehouse/movements?success=${encodeURIComponent(
          movement.movementNumber,
        )}`,
      );
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถทำรายการได้",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="assetCode">รหัสทรัพย์สิน / สแกน QR *</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanLine
              aria-hidden="true"
              className="text-muted-foreground absolute top-3 left-3 size-4"
            />
            <Input
              autoCapitalize="characters"
              autoFocus
              className="pl-9"
              id="assetCode"
              onChange={() => setAsset(null)}
              ref={assetCodeInputRef}
            />
          </div>
          <Button
            disabled={loadingAsset}
            onClick={lookupAsset}
            type="button"
            variant="outline"
          >
            <Search aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">ค้นหา</span>
          </Button>
        </div>
      </div>

      {asset ? <MovementSummary asset={asset} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={config.destinationName}>
            {config.destinationLabel} *
          </Label>
          <Input
            disabled={!asset}
            id={config.destinationName}
            name={config.destinationName}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destinationLocationName">
            {config.locationLabel} *
          </Label>
          <Input
            disabled={!asset}
            id="destinationLocationName"
            name="destinationLocationName"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="referenceNumber">เลขที่เอกสารอ้างอิง</Label>
          <Input
            disabled={!asset}
            id="referenceNumber"
            name="referenceNumber"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">หมายเหตุ</Label>
          <textarea
            className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            disabled={!asset}
            id="notes"
            name="notes"
          />
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        className="h-12 w-full sm:w-auto"
        disabled={!asset || submitting}
        type="submit"
      >
        {submitting ? "กำลังบันทึก Transaction…" : `ยืนยัน${config.title}`}
      </Button>
    </form>
  );
}
