"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { useLanguage } from "@/components/providers/language-provider";
import type { UserStatus } from "@/domain/entities/user-profile";
import { USER_ROLES, type UserRole } from "@/domain/value-objects/user-role";
import { WAREHOUSES } from "@/domain/master-data/warehouses";
import {
  createManagedUser,
  sendManagedUserPasswordReset,
  updateManagedUser,
} from "@/features/users/services/user-api.service";
import {
  managedUserCreateSchema,
  managedUserUpdateSchema,
} from "@/features/users/schemas/user.schema";
import {
  getFieldErrors,
  type FieldErrors,
} from "@/lib/validation/field-errors";

export interface ManagedUserFormValues {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly warehouseId: string | null;
  readonly customerId: string | null;
  readonly version: number;
}

export function UserForm({
  initialValues,
  currentUserId,
}: {
  initialValues?: ManagedUserFormValues;
  currentUserId: string;
}) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(
    initialValues?.role ?? "technician",
  );
  const [warehouseId, setWarehouseId] = useState(
    initialValues?.warehouseId ?? "",
  );
  const [customerId, setCustomerId] = useState(
    initialValues?.customerId ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const editingSelf = initialValues?.uid === currentUserId;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const common = {
      displayName: form.get("displayName"),
      role: form.get("role"),
      warehouseId: form.get("warehouseId") || null,
      customerId: form.get("customerId") || null,
    };
    const payload = initialValues
      ? {
          ...common,
          status: form.get("status"),
          expectedVersion: initialValues.version,
        }
      : { ...common, email: form.get("email") };
    const validation = initialValues
      ? managedUserUpdateSchema.safeParse(payload)
      : managedUserCreateSchema.safeParse(payload);
    if (!validation.success) {
      setFieldErrors(getFieldErrors(validation.error));
      return;
    }

    setBusy(true);

    try {
      if (initialValues) {
        await updateManagedUser(initialValues.uid, validation.data);
        setMessage(
          editingSelf
            ? "บันทึกแล้ว หากสิทธิ์เปลี่ยนแปลงให้เข้าสู่ระบบใหม่"
            : "บันทึกสิทธิ์ผู้ใช้แล้ว",
        );
        router.refresh();
      } else {
        const result = await createManagedUser(validation.data);
        router.replace(
          `/users/${result.id}?invitation=${
            result.invitationSent === false ? "failed" : "sent"
          }`,
        );
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถบันทึกผู้ใช้ได้",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordReset() {
    if (!initialValues) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await sendManagedUserPasswordReset(initialValues.uid);
      setMessage(
        `ส่งคำเชิญตั้งรหัสผ่านอายุ 72 ชั่วโมงไปที่ ${initialValues.email} แล้ว`,
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "ไม่สามารถส่งอีเมลตั้งรหัสผ่านได้",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          error={fieldErrors.email}
          htmlFor="email"
          label={t("field.email")}
          required
        >
          <Input
            defaultValue={initialValues?.email}
            disabled={Boolean(initialValues)}
            id="email"
            name="email"
            required
            type="email"
          />
        </FormField>
        <FormField
          error={fieldErrors.displayName}
          htmlFor="displayName"
          label={t("field.displayName")}
          required
        >
          <Input
            defaultValue={initialValues?.displayName}
            id="displayName"
            maxLength={120}
            name="displayName"
            required
          />
        </FormField>
        <div className="space-y-2">
          <Label htmlFor="role" required>
            {t("field.role")}
          </Label>
          <Select
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            disabled={editingSelf}
            id="role"
            name="role"
            onChange={(event) => setRole(event.target.value as UserRole)}
            value={role}
          >
            {USER_ROLES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          {editingSelf ? (
            <input name="role" type="hidden" value="admin" />
          ) : null}
        </div>
        {initialValues ? (
          <div className="space-y-2">
            <Label htmlFor="status" required>
              {t("field.status")}
            </Label>
            <Select
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              defaultValue={initialValues.status}
              disabled={editingSelf}
              id="status"
              name="status"
            >
              <option value="invited">
                {locale === "th" ? "รอตั้งรหัสผ่าน" : "Invited"}
              </option>
              <option value="active">
                {locale === "th" ? "ใช้งานอยู่" : "Active"}
              </option>
              <option value="disabled">
                {locale === "th" ? "ปิดใช้งาน" : "Disabled"}
              </option>
            </Select>
            {editingSelf ? (
              <input name="status" type="hidden" value="active" />
            ) : null}
          </div>
        ) : null}
        {role === "branch" ? (
          <div className="space-y-2">
            <Label htmlFor="warehouseId" required>
              {locale === "th" ? "คลังที่รับผิดชอบ" : "Assigned warehouse"}
            </Label>
            <Select
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              onChange={(event) => setWarehouseId(event.target.value)}
              id="warehouseId"
              name="warehouseId"
              required
              value={warehouseId}
            >
              <option value="">
                {locale === "th" ? "เลือกคลัง" : "Select warehouse"}
              </option>
              {WAREHOUSES.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.id} —{" "}
                  {locale === "th" ? warehouse.nameTh : warehouse.nameEn}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        {role === "customer" ? (
          <div className="space-y-2">
            <Label htmlFor="customerId" required>
              {t("field.customerId")}
            </Label>
            <Input
              id="customerId"
              maxLength={120}
              name="customerId"
              onChange={(event) => setCustomerId(event.target.value)}
              required
              value={customerId}
            />
          </div>
        ) : null}
      </div>

      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <div>
          {initialValues ? (
            <Button
              disabled={busy || initialValues.status === "disabled"}
              onClick={handlePasswordReset}
              type="button"
              variant="outline"
            >
              {locale === "th"
                ? "ส่งคำเชิญตั้งรหัสผ่าน"
                : "Send password invitation"}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button
            disabled={busy}
            onClick={() => router.back()}
            type="button"
            variant="outline"
          >
            {t("action.cancel")}
          </Button>
          <Button disabled={busy} type="submit">
            {busy
              ? t("status.loading")
              : initialValues
                ? t("action.save")
                : locale === "th"
                  ? "สร้างบัญชี"
                  : "Create account"}
          </Button>
        </div>
      </div>
    </form>
  );
}
