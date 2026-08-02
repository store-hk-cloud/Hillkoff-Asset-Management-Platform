"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
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
  findWarehouse,
  getWarehouseName,
  WAREHOUSES,
  type WarehouseId,
} from "@/domain/master-data/warehouses";
import {
  assetCreateSchema,
  assetUpdateSchema,
} from "@/features/assets/schemas/asset.schema";
import {
  getFieldErrors,
  type FieldErrors,
} from "@/lib/validation/field-errors";

export interface AssetFormInitialValues {
  readonly id: string;
  readonly assetCode: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly categoryKey: AssetCategoryKey;
  readonly serialNumber: string | null;
  readonly color: string;
  readonly condition: "operational" | "needs_repair" | "out_of_service";
  readonly warehouseId: string | null;
  readonly customerId: string | null;
  readonly locationName: string;
  readonly installedAt: string | null;
  readonly warranty: {
    readonly status: "inactive" | "active" | "expired" | "void";
    readonly startedAt: string | null;
    readonly expiresAt: string | null;
    readonly providerName: string;
    readonly providerContact: string;
    readonly coverageType: "parts" | "parts_and_labor" | "full";
    readonly documents: readonly string[];
    readonly voidReason: string | null;
  };
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [categoryKey, setCategoryKey] = useState<AssetCategoryKey>(
    initialValues?.categoryKey ??
      inferAssetCategoryKey(initialValues?.category ?? ""),
  );
  const [warehouseId, setWarehouseId] = useState(
    initialValues?.warehouseId ?? "",
  );
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
      setWarehouseId(catalog.defaultWarehouseId ?? "");
      setLocationName(
        findWarehouse(catalog.defaultWarehouseId)?.nameTh ??
          catalog.defaultLocationName,
      );
    } catch (catalogError) {
      setError(
        catalogError instanceof Error
          ? catalogError.message
          : "Unable to load machine master data.",
      );
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const warrantyDocuments = String(formData.get("warrantyDocuments") ?? "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    const payload = {
      assetCode: formData.get("assetCode"),
      name: formData.get("name"),
      description: formData.get("description"),
      category: formData.get("category"),
      categoryKey: formData.get("categoryKey"),
      serialNumber: formData.get("serialNumber") || null,
      color: formData.get("color") ?? "",
      condition: formData.get("condition"),
      installedAt: formData.get("installedAt") || null,
      ...(initialValues
        ? {
            expectedVersion: initialValues.version,
            warranty: {
              status: formData.get("warrantyStatus"),
              startedAt: formData.get("warrantyStartedAt") || null,
              expiresAt: formData.get("warrantyExpiresAt") || null,
              providerName: formData.get("warrantyProviderName") ?? "",
              providerContact: formData.get("warrantyProviderContact") ?? "",
              coverageType: formData.get("warrantyCoverageType"),
              documents: warrantyDocuments,
              voidReason: formData.get("warrantyVoidReason") || null,
              extensionMonths: formData.get("warrantyExtensionMonths")
                ? Number(formData.get("warrantyExtensionMonths"))
                : null,
            },
          }
        : {
            warehouseId: formData.get("warehouseId"),
            customerId: formData.get("customerId") || null,
            locationName: formData.get("locationName"),
          }),
    };

    const validation = initialValues
      ? assetUpdateSchema.safeParse(payload)
      : assetCreateSchema.safeParse(payload);
    if (!validation.success) {
      setFieldErrors(getFieldErrors(validation.error));
      return;
    }

    setSubmitting(true);

    try {
      const asset = initialValues
        ? await updateAsset(initialValues.id, validation.data)
        : await createAsset(validation.data);
      router.replace(`/assets/${asset.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถบันทึกเครื่องได้",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assetCode" required>
            {locale === "th" ? "รหัสเครื่อง" : "Machine code"}
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
                  ? "กำลังดึงข้อมูลเครื่อง…"
                  : "Loading machine master data…"
                : locale === "th"
                  ? "หากมีรหัสนี้แล้ว ระบบจะเติมข้อมูลถัดไปให้อัตโนมัติ"
                  : "Existing master data will fill the following fields automatically."}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" required>
            {locale === "th" ? "ชื่อเครื่อง" : "Machine name"}
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
          <Label htmlFor="categoryKey" required>
            {locale === "th" ? "หมวดหมู่" : "Category"}
          </Label>
          <Select
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
          </Select>
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
          <Label htmlFor="serialNumber" required>
            Serial Number
          </Label>
          <Input
            defaultValue={initialValues?.serialNumber ?? ""}
            id="serialNumber"
            maxLength={120}
            name="serialNumber"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">{locale === "th" ? "สี" : "Color"}</Label>
          <Input
            defaultValue={initialValues?.color ?? ""}
            id="color"
            maxLength={120}
            name="color"
            placeholder={
              locale === "th" ? "พิมพ์สีของเครื่อง" : "Enter asset color"
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="condition">
            {locale === "th" ? "สภาพ" : "Condition"}
          </Label>
          <Select
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
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="warehouseId" required>
            {locale === "th" ? "คลังเก็บ" : "Warehouse"}
          </Label>
          <Select
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm disabled:opacity-50"
            disabled={Boolean(initialValues)}
            id="warehouseId"
            name="warehouseId"
            onChange={(event) => {
              const value = event.currentTarget.value as WarehouseId | "";
              setWarehouseId(value);
              setLocationName(value ? getWarehouseName(value) : "");
            }}
            required
            value={warehouseId}
          >
            <option value="">
              {locale === "th" ? "เลือกคลังเก็บ" : "Select warehouse"}
            </option>
            {WAREHOUSES.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.id} —{" "}
                {locale === "th" ? warehouse.nameTh : warehouse.nameEn}
              </option>
            ))}
          </Select>
          <input name="locationName" type="hidden" value={locationName} />
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

        <div className="sm:col-span-2">
          <FormField
            error={fieldErrors.description}
            htmlFor="description"
            label={locale === "th" ? "รายละเอียด" : "Description"}
          >
            <Textarea
              className="border-input bg-background focus-visible:ring-ring min-h-28 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
              id="description"
              maxLength={2000}
              name="description"
              onChange={(event) => setDescription(event.currentTarget.value)}
              value={description}
            />
          </FormField>
        </div>
      </div>

      {initialValues ? (
        <section className="space-y-4 rounded-lg border p-4">
          <div>
            <h2 className="font-semibold">
              {locale === "th" ? "ข้อมูลประกันเครื่อง" : "Machine warranty"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {locale === "th"
                ? "ใช้สำหรับต่ออายุ ยกเลิก และเก็บเอกสารอ้างอิงของประกัน"
                : "Use this to extend, void, and track warranty references."}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="warrantyStatus">
                {locale === "th" ? "สถานะประกัน" : "Warranty status"}
              </Label>
              <Select
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                defaultValue={initialValues.warranty.status}
                id="warrantyStatus"
                name="warrantyStatus"
              >
                <option value="inactive">
                  {locale === "th" ? "ยังไม่เริ่ม" : "Inactive"}
                </option>
                <option value="active">
                  {locale === "th" ? "อยู่ในประกัน" : "Active"}
                </option>
                <option value="expired">
                  {locale === "th" ? "หมดประกัน" : "Expired"}
                </option>
                <option value="void">
                  {locale === "th" ? "ยกเลิกประกัน" : "Void"}
                </option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warrantyCoverageType">
                {locale === "th" ? "ความคุ้มครอง" : "Coverage"}
              </Label>
              <Select
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                defaultValue={initialValues.warranty.coverageType}
                id="warrantyCoverageType"
                name="warrantyCoverageType"
              >
                <option value="full">
                  {locale === "th" ? "ครบทั้งหมด" : "Full"}
                </option>
                <option value="parts_and_labor">
                  {locale === "th" ? "อะไหล่และค่าแรง" : "Parts and labor"}
                </option>
                <option value="parts">
                  {locale === "th" ? "เฉพาะอะไหล่" : "Parts only"}
                </option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warrantyStartedAt">
                {locale === "th" ? "วันเริ่มประกัน" : "Warranty start"}
              </Label>
              <Input
                defaultValue={initialValues.warranty.startedAt ?? ""}
                id="warrantyStartedAt"
                name="warrantyStartedAt"
                type="date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warrantyExpiresAt">
                {locale === "th" ? "วันหมดประกัน" : "Warranty expiry"}
              </Label>
              <Input
                defaultValue={initialValues.warranty.expiresAt ?? ""}
                id="warrantyExpiresAt"
                name="warrantyExpiresAt"
                type="date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warrantyExtensionMonths">
                {locale === "th" ? "ต่ออายุเพิ่ม (เดือน)" : "Extend by months"}
              </Label>
              <Input
                id="warrantyExtensionMonths"
                max="120"
                min="1"
                name="warrantyExtensionMonths"
                placeholder="0"
                type="number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warrantyProviderName">
                {locale === "th" ? "ผู้ให้ประกัน" : "Warranty provider"}
              </Label>
              <Input
                defaultValue={initialValues.warranty.providerName}
                id="warrantyProviderName"
                maxLength={200}
                name="warrantyProviderName"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="warrantyProviderContact">
                {locale === "th"
                  ? "ช่องทางติดต่อผู้ให้ประกัน"
                  : "Provider contact"}
              </Label>
              <Input
                defaultValue={initialValues.warranty.providerContact}
                id="warrantyProviderContact"
                maxLength={200}
                name="warrantyProviderContact"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="warrantyDocuments">
                {locale === "th"
                  ? "ลิงก์เอกสารประกัน"
                  : "Warranty document links"}
              </Label>
              <Textarea
                className="border-input bg-background focus-visible:ring-ring min-h-24 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                defaultValue={initialValues.warranty.documents.join("\n")}
                id="warrantyDocuments"
                name="warrantyDocuments"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="warrantyVoidReason">
                {locale === "th" ? "เหตุผลยกเลิกประกัน" : "Void reason"}
              </Label>
              <Textarea
                className="border-input bg-background focus-visible:ring-ring min-h-20 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                defaultValue={initialValues.warranty.voidReason ?? ""}
                id="warrantyVoidReason"
                maxLength={500}
                name="warrantyVoidReason"
              />
            </div>
          </div>
        </section>
      ) : null}

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
