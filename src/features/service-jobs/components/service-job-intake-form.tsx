"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceJobWorkType } from "@/domain/entities/service-job";
import { createServiceJob } from "@/features/service-jobs/services/service-job-api.service";

export function ServiceJobIntakeForm({
  initialWorkType = "repair",
}: {
  initialWorkType?: ServiceJobWorkType;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    try {
      const result = await createServiceJob({
        idempotencyKey: crypto.randomUUID(),
        workType: data.get("workType"),
        fulfillmentMode: data.get("fulfillmentMode"),
        title: data.get("title"),
        description: data.get("description"),
        termsAcceptedAt: now,
        termsAcceptedBy: data.get("contactName"),
        customer: {
          customerId: data.get("customerId") || null,
          name: data.get("customerName"),
          taxId: null,
          group: null,
          billingAddress: data.get("serviceAddress"),
          serviceAddress: data.get("serviceAddress"),
          primaryPhone: data.get("phone"),
          secondaryPhone: null,
        },
        contact: {
          name: data.get("contactName"),
          phone: data.get("phone"),
          extension: null,
          email: data.get("email") || null,
        },
        asset: {
          assetId: data.get("assetId") || null,
          assetCode: data.get("assetCode") || null,
          serialNumber: data.get("serialNumber") || null,
          equipmentType: data.get("equipmentType"),
          brand: data.get("brand"),
          model: data.get("model"),
          warrantyStatus: data.get("warrantyStatus"),
          warrantyExpiresAt: null,
          repeatRepair: false,
          previousRepairNumber: null,
          includedAccessories: [],
          observedDefects: [],
          additionalRequirements: "",
        },
      });
      const job = result as { id?: string };
      router.push(job.id ? `/service-jobs/${job.id}` : "/service-jobs");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "สร้างใบงานช่างไม่สำเร็จ / Unable to create service work order.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="space-y-6" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>
            ข้อมูลลูกค้าและคำขอรับบริการช่าง / Customer and technician service
            request
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            ประเภทงาน / Work type
            <select
              className="input"
              defaultValue={initialWorkType}
              name="workType"
              required
            >
              <option value="repair">งานซ่อม / Repair</option>
              <option value="installation">งานติดตั้ง / Installation</option>
              <option value="new_machine_test">
                ทดสอบเครื่องใหม่ / New machine test
              </option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            รูปแบบเข้าปฏิบัติงาน / Work fulfillment
            <select className="input" name="fulfillmentMode" required>
              <option value="onsite">หน้างาน / On-site</option>
              <option value="carry_in">นำเครื่องเข้าศูนย์ / Carry-in</option>
              <option value="carrier">ขนส่ง / Carrier</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            หัวข้องาน / Title
            <input className="input" maxLength={200} name="title" required />
          </label>
          <label className="grid gap-2 text-sm">
            ชื่อลูกค้า / Customer name
            <input
              className="input"
              maxLength={160}
              name="customerName"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            ผู้ติดต่อ / Contact name
            <input
              className="input"
              maxLength={160}
              name="contactName"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            โทรศัพท์ / Phone
            <input className="input" maxLength={40} name="phone" required />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            สถานที่ปฏิบัติงาน / Service location
            <input
              className="input"
              maxLength={1000}
              name="serviceAddress"
              required
            />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            รายละเอียดปัญหาหรือความต้องการ / Description
            <textarea
              className="input min-h-28"
              maxLength={3000}
              name="description"
              required
            />
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลเครื่อง / Machine snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            รหัสเครื่อง / Asset code
            <input className="input" name="assetCode" />
          </label>
          <label className="grid gap-2 text-sm">
            หมายเลขเครื่อง / Serial number
            <input className="input" name="serialNumber" />
          </label>
          <label className="grid gap-2 text-sm">
            ประเภทอุปกรณ์ / Equipment type
            <input className="input" name="equipmentType" required />
          </label>
          <label className="grid gap-2 text-sm">
            ยี่ห้อ / Brand
            <input className="input" name="brand" required />
          </label>
          <label className="grid gap-2 text-sm">
            รุ่น / Model
            <input className="input" name="model" required />
          </label>
          <label className="grid gap-2 text-sm">
            การรับประกัน / Warranty
            <select className="input" name="warrantyStatus">
              <option value="unknown">ไม่ทราบ / Unknown</option>
              <option value="active">มีผล / Active</option>
              <option value="expired">หมดอายุ / Expired</option>
            </select>
          </label>
        </CardContent>
      </Card>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={busy} type="submit">
        {busy
          ? "กำลังสร้าง… / Creating…"
          : "สร้างใบงานช่าง / Create Service Work Order"}
      </Button>
    </form>
  );
}
