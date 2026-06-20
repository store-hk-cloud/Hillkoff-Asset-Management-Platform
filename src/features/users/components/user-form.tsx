"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserStatus } from "@/domain/entities/user-profile";
import { USER_ROLES, type UserRole } from "@/domain/value-objects/user-role";
import {
  createManagedUser,
  sendManagedUserPasswordReset,
  updateManagedUser,
} from "@/features/users/services/user-api.service";

export interface ManagedUserFormValues {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly branchId: string | null;
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
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(
    initialValues?.role ?? "technician",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editingSelf = initialValues?.uid === currentUserId;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const common = {
      displayName: form.get("displayName"),
      role: form.get("role"),
      branchId: form.get("branchId") || null,
      customerId: form.get("customerId") || null,
    };

    try {
      if (initialValues) {
        await updateManagedUser(initialValues.uid, {
          ...common,
          status: form.get("status"),
          expectedVersion: initialValues.version,
        });
        setMessage(
          editingSelf
            ? "บันทึกแล้ว หากสิทธิ์เปลี่ยนแปลงให้เข้าสู่ระบบใหม่"
            : "บันทึกสิทธิ์ผู้ใช้แล้ว",
        );
        router.refresh();
      } else {
        const result = await createManagedUser({
          ...common,
          email: form.get("email"),
        });
        router.replace(`/users/${result.id}`);
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
      setMessage(`ส่งอีเมลตั้งรหัสผ่านไปที่ ${initialValues.email} แล้ว`);
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
        <div className="space-y-2">
          <Label htmlFor="email">อีเมล *</Label>
          <Input
            defaultValue={initialValues?.email}
            disabled={Boolean(initialValues)}
            id="email"
            name="email"
            required
            type="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">ชื่อผู้ใช้งาน *</Label>
          <Input
            defaultValue={initialValues?.displayName}
            id="displayName"
            maxLength={120}
            name="displayName"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <select
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
          </select>
          {editingSelf ? (
            <input name="role" type="hidden" value="admin" />
          ) : null}
        </div>
        {initialValues ? (
          <div className="space-y-2">
            <Label htmlFor="status">สถานะ *</Label>
            <select
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              defaultValue={initialValues.status}
              disabled={editingSelf}
              id="status"
              name="status"
            >
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </select>
            {editingSelf ? (
              <input name="status" type="hidden" value="active" />
            ) : null}
          </div>
        ) : null}
        {role === "branch" ? (
          <div className="space-y-2">
            <Label htmlFor="branchId">Branch ID *</Label>
            <Input
              defaultValue={initialValues?.branchId ?? ""}
              id="branchId"
              maxLength={120}
              name="branchId"
              required
            />
          </div>
        ) : null}
        {role === "customer" ? (
          <div className="space-y-2">
            <Label htmlFor="customerId">Customer ID *</Label>
            <Input
              defaultValue={initialValues?.customerId ?? ""}
              id="customerId"
              maxLength={120}
              name="customerId"
              required
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
              disabled={busy}
              onClick={handlePasswordReset}
              type="button"
              variant="outline"
            >
              ส่ง Password Reset
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
            ยกเลิก
          </Button>
          <Button disabled={busy} type="submit">
            {busy ? "กำลังบันทึก…" : initialValues ? "บันทึก" : "สร้างบัญชี"}
          </Button>
        </div>
      </div>
    </form>
  );
}
