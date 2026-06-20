"use client";

import { useRef, useState, type FormEvent } from "react";
import { ScanLine, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import type { Asset } from "@/domain/entities/asset";
import { MovementSummary } from "@/features/warehouse/components/movement-summary";
import {
  findWarehouseAsset,
  submitMovement,
} from "@/features/warehouse/services/warehouse-api.service";
import {
  BRANCHES,
  getBranchLocationName,
  type BranchId,
} from "@/domain/master-data/branches";

type MovementAction = "receive" | "transfer" | "sale";

type MovementFormProps = Readonly<{
  action: MovementAction;
}>;

const labels = {
  th: {
    receive: {
      title: "รับเข้าคลัง/สาขา",
      destinationLabel: "รหัสสาขาปลายทาง",
      destinationName: "destinationBranchId",
      locationLabel: "สถานที่รับเข้า",
    },
    transfer: {
      title: "โอนสาขา",
      destinationLabel: "รหัสสาขาปลายทาง",
      destinationName: "destinationBranchId",
      locationLabel: "สถานที่ปลายทาง",
    },
    sale: {
      title: "ขายลูกค้า",
      destinationLabel: "รหัสลูกค้า",
      destinationName: "customerId",
      locationLabel: "สถานที่ส่งมอบ/ติดตั้ง",
    },
  },
  en: {
    receive: {
      title: "Receive asset",
      destinationLabel: "Destination branch ID",
      destinationName: "destinationBranchId",
      locationLabel: "Receiving location",
    },
    transfer: {
      title: "Transfer asset",
      destinationLabel: "Destination branch ID",
      destinationName: "destinationBranchId",
      locationLabel: "Destination location",
    },
    sale: {
      title: "Sell asset",
      destinationLabel: "Customer ID",
      destinationName: "customerId",
      locationLabel: "Delivery / installation location",
    },
  },
} as const satisfies Record<
  "th" | "en",
  Record<
    MovementAction,
    {
      title: string;
      destinationLabel: string;
      destinationName: "destinationBranchId" | "customerId";
      locationLabel: string;
    }
  >
>;

export function MovementForm({ action }: MovementFormProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const assetCodeInputRef = useRef<HTMLInputElement>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const config = labels[locale][action];

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
      ...(action === "receive"
        ? {
            sourceType: formData.get("sourceType"),
            sourceName: formData.get("sourceName"),
          }
        : {}),
      referenceNumber: formData.get("referenceNumber") || null,
      notes: formData.get("notes") ?? "",
      expectedVersion: asset.version,
    };

    setSubmitting(true);
    setError(null);

    try {
      const movement = await submitMovement(action, payload);
      router.replace(
        `${action === "transfer" ? "/warehouse/transfers" : "/warehouse/movements"}?success=${encodeURIComponent(
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
        <Label htmlFor="assetCode">
          {locale === "th"
            ? "Serial Number / Asset ID / รหัสทรัพย์สิน"
            : "Serial number / Asset ID / Asset code"}{" "}
          *
        </Label>
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
              name="assetCode"
              onChange={() => setAsset(null)}
              placeholder={
                locale === "th"
                  ? "แนะนำให้ใช้ Serial Number หรือสแกน QR"
                  : "Serial number or QR scan is recommended"
              }
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
            <span className="hidden sm:inline">{t("action.search")}</span>
          </Button>
        </div>
      </div>

      {asset ? <MovementSummary asset={asset} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={config.destinationName}>
            {config.destinationLabel} *
          </Label>
          {action === "sale" ? (
            <Input
              disabled={!asset}
              id={config.destinationName}
              name={config.destinationName}
              required
            />
          ) : (
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm disabled:opacity-50"
              disabled={!asset}
              id="destinationBranchId"
              name="destinationBranchId"
              onChange={(event) =>
                setDestinationBranchId(event.currentTarget.value)
              }
              required
              value={destinationBranchId}
            >
              <option value="">
                {locale === "th" ? "เลือกสาขาปลายทาง" : "Select destination"}
              </option>
              {BRANCHES.map((branch) => (
                <option
                  disabled={
                    action === "transfer" && asset?.branchId === branch.id
                  }
                  key={branch.id}
                  value={branch.id}
                >
                  {locale === "th" ? branch.nameTh : branch.nameEn} ({branch.id}
                  )
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="destinationLocationName">
            {config.locationLabel} *
          </Label>
          {action === "sale" ? (
            <Input
              disabled={!asset}
              id="destinationLocationName"
              name="destinationLocationName"
              required
            />
          ) : (
            <>
              <Input
                disabled
                id="destinationLocationName"
                readOnly
                value={
                  destinationBranchId
                    ? getBranchLocationName(destinationBranchId as BranchId)
                    : ""
                }
              />
              <input
                name="destinationLocationName"
                type="hidden"
                value={
                  destinationBranchId
                    ? getBranchLocationName(destinationBranchId as BranchId)
                    : ""
                }
              />
            </>
          )}
        </div>
        {action === "receive" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="sourceType">
                {locale === "th" ? "ประเภทต้นทาง" : "Source type"} *
              </Label>
              <select
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm disabled:opacity-50"
                disabled={!asset}
                id="sourceType"
                name="sourceType"
                required
              >
                <option value="supplier">
                  {locale === "th" ? "ผู้จำหน่าย" : "Supplier"}
                </option>
                <option value="external">
                  {locale === "th" ? "หน่วยงานภายนอก" : "External"}
                </option>
                <option value="other">
                  {locale === "th" ? "อื่นๆ" : "Other"}
                </option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceName">
                {locale === "th" ? "ชื่อต้นทาง/ผู้จำหน่าย" : "Source name"} *
              </Label>
              <Input
                disabled={!asset}
                id="sourceName"
                name="sourceName"
                required
              />
            </div>
          </>
        ) : null}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="referenceNumber">
            {locale === "th" ? "เลขที่เอกสารอ้างอิง" : "Reference number"}
          </Label>
          <Input
            disabled={!asset}
            id="referenceNumber"
            name="referenceNumber"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">
            {locale === "th" ? "หมายเหตุ" : "Notes"}
          </Label>
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
        {submitting
          ? t("status.loading")
          : locale === "th"
            ? `ยืนยัน${config.title}`
            : `Confirm ${config.title.toLowerCase()}`}
      </Button>
    </form>
  );
}
