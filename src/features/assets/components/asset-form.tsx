"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import {
  createAsset,
  findAssetCatalog,
  updateAsset,
} from "@/features/assets/services/asset-api.service";
import {
  ASSET_CATEGORIES,
  getAssetCategoryName,
  inferAssetCategoryKey,
  type AssetCategoryKey,
} from "@/domain/master-data/asset-categories";
import {
  BRANCHES,
  findBranch,
  getBranchLocationName,
  type BranchId,
} from "@/domain/master-data/branches";

export interface AssetFormInitialValues {
  readonly id: string;
  readonly assetCode: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly categoryKey: AssetCategoryKey;
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
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [categoryKey, setCategoryKey] = useState<AssetCategoryKey>(
    initialValues?.categoryKey ??
      inferAssetCategoryKey(initialValues?.category ?? ""),
  );
  const [branchId, setBranchId] = useState(initialValues?.branchId ?? "");
  const [locationName, setLocationName] = useState(
    initialValues?.locationName ?? "",
  );

  async function autofillFromCatalog(assetCode: string) {
    if (initialValues || !assetCode.trim()) {
      return;
    }

    setLoadingCatalog(true);
    setError(null);

    try {
      const catalog = await findAssetCatalog(assetCode.trim());
      if (!catalog) {
        return;
      }

      setName(catalog.name);
      setDescription(catalog.description);
      setCategory(catalog.category);
      setCategoryKey(catalog.categoryKey);
      setBranchId(catalog.defaultBranchId ?? "");
      setLocationName(
        findBranch(catalog.defaultBranchId)?.nameTh ??
          catalog.defaultLocationName,
      );
    } catch (catalogError) {
      setError(
        catalogError instanceof Error
          ? catalogError.message
          : "Unable to load asset master data.",
      );
    } finally {
      setLoadingCatalog(false);
    }
  }

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
      categoryKey: formData.get("categoryKey"),
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
            onBlur={(event) =>
              void autofillFromCatalog(event.currentTarget.value)
            }
            required
          />
          {!initialValues ? (
            <p className="text-muted-foreground text-xs">
              {loadingCatalog
                ? locale === "th"
                  ? "กำลังดึงข้อมูลทรัพย์สิน…"
                  : "Loading asset master data…"
                : locale === "th"
                  ? "หากมีรหัสนี้แล้ว ระบบจะเติมข้อมูลถัดไปให้อัตโนมัติ"
                  : "Existing master data will fill the following fields automatically."}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">
            {locale === "th" ? "ชื่อทรัพย์สิน" : "Asset name"} *
          </Label>
          <Input
            id="name"
            maxLength={160}
            name="name"
            onChange={(event) => setName(event.currentTarget.value)}
            required
            value={name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoryKey">
            {locale === "th" ? "หมวดหมู่" : "Category"} *
          </Label>
          <select
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            id="categoryKey"
            name="categoryKey"
            onChange={(event) => {
              const nextKey = event.currentTarget.value as AssetCategoryKey;
              setCategoryKey(nextKey);
              setCategory(
                nextKey === "other" ? "" : getAssetCategoryName(nextKey, "th"),
              );
            }}
            value={categoryKey}
          >
            {ASSET_CATEGORIES.map((item) => (
              <option key={item.key} value={item.key}>
                {locale === "th" ? item.nameTh : item.nameEn}
              </option>
            ))}
          </select>
          <input name="category" type="hidden" value={category} />
          {categoryKey === "other" ? (
            <Input
              aria-label={
                locale === "th" ? "ระบุหมวดหมู่อื่น" : "Custom category"
              }
              maxLength={120}
              onChange={(event) => setCategory(event.currentTarget.value)}
              placeholder={
                locale === "th" ? "ระบุชื่อหมวดหมู่" : "Enter category name"
              }
              required
              value={category}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="serialNumber">Serial Number *</Label>
          <Input
            defaultValue={initialValues?.serialNumber ?? ""}
            id="serialNumber"
            maxLength={120}
            name="serialNumber"
            required
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
          <Label htmlFor="branchId">
            {locale === "th" ? "สถานที่" : "Location"}
          </Label>
          <select
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm disabled:opacity-50"
            disabled={Boolean(initialValues)}
            id="branchId"
            name="branchId"
            onChange={(event) => {
              const value = event.currentTarget.value as BranchId | "";
              setBranchId(value);
              setLocationName(value ? getBranchLocationName(value) : "");
            }}
            value={branchId}
          >
            <option value="">
              {locale === "th" ? "เลือกสาขา" : "Select branch"}
            </option>
            {BRANCHES.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {locale === "th" ? branch.nameTh : branch.nameEn} ({branch.id})
              </option>
            ))}
          </select>
          <input name="locationName" type="hidden" value={locationName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="branchCode">{t("field.branchId")}</Label>
          <Input disabled id="branchCode" readOnly value={branchId} />
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
            id="description"
            maxLength={2000}
            name="description"
            onChange={(event) => setDescription(event.currentTarget.value)}
            value={description}
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
