"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import {
  createAsset,
  updateAsset,
} from "@/features/assets/services/asset-api.service";

export interface AssetFormInitialValues {
  readonly id: string;
  readonly assetCode: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly serialNumber: string | null;
  readonly condition: "operational" | "needs_repair" | "out_of_service";
  readonly branchId: string | null;
  readonly customerId: string | null;
  readonly locationName: string;
  readonly installedAt: string | null;
  readonly version: number;
}

type AssetFormProps = Readonly<{
  initialValues?: AssetFormInitialValues;
}>;

export function AssetForm({ initialValues }: AssetFormProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      assetCode: formData.get("assetCode"),
      name: formData.get("name"),
      description: formData.get("description"),
      category: formData.get("category"),
      serialNumber: formData.get("serialNumber") || null,
      condition: formData.get("condition"),
      installedAt: formData.get("installedAt") || null,
      ...(initialValues
        ? { expectedVersion: initialValues.version }
        : {
            branchId: formData.get("branchId") || null,
            customerId: formData.get("customerId") || null,
            locationName: formData.get("locationName"),
          }),
    };

    try {
      const asset = initialValues
        ? await updateAsset(initialValues.id, payload)
        : await createAsset(payload);
      router.replace(`/assets/${asset.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถบันทึกทรัพย์สินได้",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assetCode">
            {locale === "th" ? "รหัสทรัพย์สิน" : "Asset code"} *
          </Label>
          <Input
            defaultValue={initialValues?.assetCode}
            id="assetCode"
            maxLength={60}
            name="assetCode"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">
            {locale === "th" ? "ชื่อทรัพย์สิน" : "Asset name"} *
          </Label>
          <Input
            defaultValue={initialValues?.name}
            id="name"
            maxLength={160}
            name="name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">
            {locale === "th" ? "หมวดหมู่" : "Category"} *
          </Label>
          <Input
            defaultValue={initialValues?.category}
            id="category"
            maxLength={120}
            name="category"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="serialNumber">Serial Number</Label>
          <Input
            defaultValue={initialValues?.serialNumber ?? ""}
            id="serialNumber"
            maxLength={120}
            name="serialNumber"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="condition">
            {locale === "th" ? "สภาพ" : "Condition"}
          </Label>
          <select
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            defaultValue={initialValues?.condition ?? "operational"}
            id="condition"
            name="condition"
          >
            <option value="operational">
              {locale === "th" ? "พร้อมใช้งาน" : "Operational"}
            </option>
            <option value="needs_repair">
              {locale === "th" ? "ต้องซ่อม" : "Needs repair"}
            </option>
            <option value="out_of_service">
              {locale === "th" ? "หยุดใช้งาน" : "Out of service"}
            </option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationName">
            {locale === "th" ? "สถานที่" : "Location"}
          </Label>
          <Input
            defaultValue={initialValues?.locationName}
            disabled={Boolean(initialValues)}
            id="locationName"
            maxLength={200}
            name="locationName"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="branchId">{t("field.branchId")}</Label>
          <Input
            defaultValue={initialValues?.branchId ?? ""}
            disabled={Boolean(initialValues)}
            id="branchId"
            maxLength={120}
            name="branchId"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerId">{t("field.customerId")}</Label>
          <Input
            defaultValue={initialValues?.customerId ?? ""}
            disabled={Boolean(initialValues)}
            id="customerId"
            maxLength={120}
            name="customerId"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="installedAt">
            {locale === "th" ? "วันที่ติดตั้ง" : "Installation date"}
          </Label>
          <Input
            defaultValue={initialValues?.installedAt ?? ""}
            id="installedAt"
            name="installedAt"
            type="date"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">
            {locale === "th" ? "รายละเอียด" : "Description"}
          </Label>
          <textarea
            className="border-input bg-background focus-visible:ring-ring min-h-28 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
            defaultValue={initialValues?.description}
            id="description"
            maxLength={2000}
            name="description"
          />
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          disabled={submitting}
          onClick={() => router.back()}
          type="button"
          variant="outline"
        >
          {t("action.cancel")}
        </Button>
        <Button disabled={submitting} type="submit">
          {submitting ? t("status.loading") : t("action.save")}
        </Button>
      </div>
    </form>
  );
}
