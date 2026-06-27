"use client";

import { useRef, useState, type FormEvent } from "react";
import { Layers, QrCode, Radio, ScanLine, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import type { Asset } from "@/domain/entities/asset";
import { MovementSummary } from "@/features/warehouse/components/movement-summary";
import { scanNfcUrl } from "@/features/asset-identity/services/nfc.service";
import {
  findWarehouseAsset,
  bulkFindWarehouseAssets,
  submitMovement,
  submitBulkTransfer,
} from "@/features/warehouse/services/warehouse-api.service";
import { scanQrCode } from "@/features/warehouse/services/qr-scanner.service";
import {
  getWarehouseName,
  WAREHOUSES,
  type WarehouseId,
} from "@/domain/master-data/warehouses";

type MovementAction = "transfer" | "sale";

type MovementFormProps = Readonly<{
  action: MovementAction;
}>;

const labels = {
  th: {
    transfer: {
      title: "ย้ายคลัง",
      destinationLabel: "คลังปลายทาง",
      destinationName: "destinationWarehouseId",
      locationLabel: "ชื่อคลังปลายทาง",
    },
    sale: {
      title: "ขายลูกค้า",
      destinationLabel: "รหัสลูกค้า",
      destinationName: "customerId",
      locationLabel: "สถานที่ส่งมอบ/ติดตั้ง",
    },
  },
  en: {
    transfer: {
      title: "Move warehouse",
      destinationLabel: "Destination warehouse",
      destinationName: "destinationWarehouseId",
      locationLabel: "Destination warehouse name",
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
      destinationName: "destinationWarehouseId" | "customerId";
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
  const [scanningQr, setScanningQr] = useState(false);
  const [scanningNfc, setScanningNfc] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const config = labels[locale][action];

  // Bulk mode (transfer only)
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCodes, setBulkCodes] = useState("");
  const [bulkAssets, setBulkAssets] = useState<Asset[]>([]);
  const [bulkNotFound, setBulkNotFound] = useState<string[]>([]);
  const [loadingBulk, setLoadingBulk] = useState(false);

  async function lookupAsset(referenceOverride?: string) {
    const assetReference =
      referenceOverride?.trim() ?? assetCodeInputRef.current?.value.trim();

    if (!assetReference) {
      setError("กรุณาระบุรหัสทรัพย์สิน");
      return;
    }

    setLoadingAsset(true);
    setError(null);

    try {
      setAsset(await findWarehouseAsset(assetReference));
    } catch (lookupError) {
      setAsset(null);
      setError(
        lookupError instanceof Error ? lookupError.message : "ไม่พบทรัพย์สิน",
      );
    } finally {
      setLoadingAsset(false);
    }
  }

  async function scanQr() {
    setScanningQr(true);
    setError(null);

    try {
      const reference = await scanQrCode();
      if (assetCodeInputRef.current) {
        assetCodeInputRef.current.value = reference;
      }
      await lookupAsset(reference);
    } catch (scanError) {
      setAsset(null);
      setError(
        scanError instanceof Error ? scanError.message : "QR scan failed.",
      );
    } finally {
      setScanningQr(false);
    }
  }

  async function scanNfc() {
    setScanningNfc(true);
    setError(null);

    try {
      const tag = await scanNfcUrl();
      if (assetCodeInputRef.current) {
        assetCodeInputRef.current.value = tag.url;
      }
      await lookupAsset(tag.url);
    } catch (scanError) {
      setAsset(null);
      setError(
        scanError instanceof Error ? scanError.message : "NFC scan failed.",
      );
    } finally {
      setScanningNfc(false);
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
      assetId: asset.id,
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
        `/warehouse/movements?success=${encodeURIComponent(movement.movementNumber)}`,
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

  async function loadBulkAssets() {
    const codes = bulkCodes
      .split(/[\n,]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (codes.length === 0) {
      setError(
        locale === "th"
          ? "กรุณาระบุรหัสทรัพย์สินอย่างน้อย 1 รายการ"
          : "Enter at least one asset code",
      );
      return;
    }

    if (codes.length > 50) {
      setError(
        locale === "th"
          ? "ระบุได้สูงสุด 50 รายการต่อครั้ง"
          : "Maximum 50 items at a time",
      );
      return;
    }

    const unique = [...new Set(codes)];
    setLoadingBulk(true);
    setError(null);
    setBulkAssets([]);
    setBulkNotFound([]);

    const result = await bulkFindWarehouseAssets(unique);

    // Filter out duplicates within loaded assets
    const seen = new Set<string>();
    const deduped: Asset[] = [];
    for (const a of result.found) {
      if (!seen.has(a.assetCode)) {
        seen.add(a.assetCode);
        deduped.push(a);
      }
    }

    setBulkAssets(deduped);
    setBulkNotFound([...new Set([...result.notFound, ...result.errors])]);
    setLoadingBulk(false);
  }

  function removeBulkAsset(assetCode: string) {
    setBulkAssets((prev) =>
      prev.filter((a) => a.assetCode !== assetCode),
    );
  }

  async function handleBulkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (bulkAssets.length === 0) {
      setError(
        locale === "th"
          ? "ไม่มีทรัพย์สินที่จะย้าย กรุณาโหลดรายการก่อน"
          : "No assets loaded. Load items first.",
      );
      return;
    }

    if (!destinationWarehouseId) {
      setError(
        locale === "th"
          ? "กรุณาเลือกคลังปลายทาง"
          : "Please select a destination warehouse.",
      );
      return;
    }

    const formData = new FormData(event.currentTarget);

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitBulkTransfer({
        assetCodes: bulkAssets.map((a) => a.assetCode),
        destinationWarehouseId,
        referenceNumber:
          (formData.get("referenceNumber") as string) || null,
        notes: (formData.get("notes") as string) ?? "",
      });

      const succeededMsg =
        result.succeeded.length > 0
          ? `${result.succeeded[0]?.movementNumber ?? ""}`
          : "";
      const params = new URLSearchParams();
      if (succeededMsg) {
        params.set("success", `${succeededMsg} +${result.succeeded.length - 1}`);
      }

      router.replace(`/warehouse/movements?${params}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : locale === "th"
            ? "ไม่สามารถทำรายการได้"
            : "Transfer failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={bulkMode ? handleBulkSubmit : handleSubmit}>
      {/* Single mode */}
      {!bulkMode ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="assetCode">
              {locale === "th"
                ? "Serial Number / Asset ID / รหัสทรัพย์สิน"
                : "Serial number / Asset ID / Asset code"}{" "}
              *
            </Label>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
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
                disabled={loadingAsset || scanningQr || scanningNfc}
                onClick={() => void lookupAsset()}
                type="button"
                variant="outline"
              >
                <Search aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">{t("action.search")}</span>
              </Button>
              <Button
                disabled={loadingAsset || scanningQr || scanningNfc}
                onClick={() => void scanQr()}
                type="button"
                variant="outline"
              >
                <QrCode aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">
                  {scanningQr ? t("status.loading") : "QR"}
                </span>
              </Button>
              <Button
                disabled={loadingAsset || scanningQr || scanningNfc}
                onClick={() => void scanNfc()}
                type="button"
                variant="outline"
              >
                <Radio aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">
                  {scanningNfc ? t("status.loading") : "NFC"}
                </span>
              </Button>
            </div>
          </div>
          {asset ? <MovementSummary asset={asset} /> : null}
        </>
      ) : null}

      {/* Bulk mode */}
      {bulkMode ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="bulkCodes">
              {locale === "th"
                ? "รหัสทรัพย์สิน / Serial Number (หลายรายการ คั่นด้วย Enter หรือ ,)"
                : "Asset code / Serial number (multiple, separated by Enter or ,)"} *
            </Label>
            <textarea
              className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm font-mono"
              id="bulkCodes"
              maxLength={5000}
              onChange={(e) => setBulkCodes(e.currentTarget.value)}
              placeholder={
                locale === "th"
                  ? "ระบุ Serial Number หรือรหัสทีละบรรทัด\nHK-CM-001\nHK-GR-015\n20250601-001"
                  : "Serial number or asset code, one per line\nHK-CM-001\nHK-GR-015\n20250601-001"
              }
              value={bulkCodes}
            />
          </div>
          <Button
            disabled={loadingBulk || !bulkCodes.trim()}
            onClick={() => void loadBulkAssets()}
            type="button"
          >
            <Layers aria-hidden="true" className="size-4" />
            {loadingBulk ? t("status.loading") : locale === "th" ? "โหลดรายการทรัพย์สิน" : "Load Assets"}
          </Button>
          {bulkNotFound.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">{locale === "th" ? "ไม่พบรายการต่อไปนี้" : "Not found"}:</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {bulkNotFound.map((c) => (
                  <span className="bg-amber-100 rounded px-2 py-0.5 font-mono text-xs" key={c}>{c}</span>
                ))}
              </div>
            </div>
          ) : null}
          {bulkAssets.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {locale === "th" ? `พบ ${bulkAssets.length} รายการ` : `${bulkAssets.length} assets found`}
              </p>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {bulkAssets.map((a) => (
                  <div className="flex items-start gap-3 rounded-lg border p-3" key={a.assetCode}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.name}</p>
                      <p className="font-mono text-xs">{a.assetCode}</p>
                      <p className="text-muted-foreground text-xs">
                        {a.locationName}{a.serialNumber ? ` · Serial: ${a.serialNumber}` : ""}
                      </p>
                    </div>
                    <Button
                      aria-label={locale === "th" ? "ลบ" : "Remove"}
                      onClick={() => removeBulkAsset(a.assetCode)}
                      size="icon" type="button" variant="ghost"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

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
              disabled={bulkMode ? loadingBulk || submitting : !asset}
              id="destinationWarehouseId"
              name="destinationWarehouseId"
              onChange={(event) =>
                setDestinationWarehouseId(event.currentTarget.value)
              }
              required
              value={destinationWarehouseId}
            >
              <option value="">
                {locale === "th" ? "เลือกคลังปลายทาง" : "Select destination"}
              </option>
              {WAREHOUSES.map((warehouse) => (
                <option
                  disabled={
                    action === "transfer" &&
                    (bulkMode
                      ? bulkAssets.some((a) => a.warehouseId === warehouse.id)
                      : asset?.warehouseId === warehouse.id)
                  }
                  key={warehouse.id}
                  value={warehouse.id}
                >
                  {warehouse.id} —{" "}
                  {locale === "th" ? warehouse.nameTh : warehouse.nameEn}
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
                  destinationWarehouseId
                    ? getWarehouseName(destinationWarehouseId as WarehouseId)
                    : ""
                }
              />
              <input
                name="destinationLocationName"
                type="hidden"
                value={
                  destinationWarehouseId
                    ? getWarehouseName(destinationWarehouseId as WarehouseId)
                    : ""
                }
              />
            </>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="referenceNumber">
            {locale === "th" ? "เลขที่เอกสารอ้างอิง" : "Reference number"}
          </Label>
          <Input
            disabled={bulkMode ? loadingBulk || submitting : !asset}
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
            disabled={bulkMode ? loadingBulk || submitting : !asset}
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

      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="h-12 sm:w-auto"
          disabled={
            bulkMode
              ? bulkAssets.length === 0 || submitting
              : !asset || submitting
          }
          type="submit"
        >
          {submitting
            ? t("status.loading")
            : locale === "th"
              ? `ยืนยัน${config.title}`
              : `Confirm ${config.title.toLowerCase()}`}
        </Button>

        {action === "transfer" ? (
          <Button
            disabled={submitting || loadingBulk}
            onClick={() => {
              setBulkMode(!bulkMode);
              setError(null);
              if (bulkMode) {
                setAsset(null);
                setBulkAssets([]);
                setBulkNotFound([]);
                setBulkCodes("");
              }
            }}
            type="button"
            variant="outline"
          >
            <Layers aria-hidden="true" className="size-4" />
            {bulkMode
              ? locale === "th"
                ? "เปลี่ยนเป็นย้ายเดี่ยว"
                : "Switch to single"
              : locale === "th"
                ? "ย้ายหลายรายการพร้อมกัน"
                : "Bulk transfer"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
