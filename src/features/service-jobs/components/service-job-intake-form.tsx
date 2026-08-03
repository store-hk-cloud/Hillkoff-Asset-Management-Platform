"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServiceJob } from "@/features/service-jobs/services/service-job-api.service";

export function ServiceJobIntakeForm() {
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
          : "Unable to create service job.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="space-y-6" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Customer and request</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            Work type
            <select className="input" name="workType" required>
              <option value="repair">Repair</option>
              <option value="installation">Installation</option>
              <option value="new_machine_test">New machine test</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            Fulfillment
            <select className="input" name="fulfillmentMode" required>
              <option value="onsite">On-site</option>
              <option value="carry_in">Carry-in</option>
              <option value="carrier">Carrier</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            Title
            <input className="input" maxLength={200} name="title" required />
          </label>
          <label className="grid gap-2 text-sm">
            Customer name
            <input
              className="input"
              maxLength={160}
              name="customerName"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            Contact name
            <input
              className="input"
              maxLength={160}
              name="contactName"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            Phone
            <input className="input" maxLength={40} name="phone" required />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            Service address
            <input
              className="input"
              maxLength={1000}
              name="serviceAddress"
              required
            />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            Description
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
          <CardTitle>Machine snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            Asset code
            <input className="input" name="assetCode" />
          </label>
          <label className="grid gap-2 text-sm">
            Serial number
            <input className="input" name="serialNumber" />
          </label>
          <label className="grid gap-2 text-sm">
            Equipment type
            <input className="input" name="equipmentType" required />
          </label>
          <label className="grid gap-2 text-sm">
            Brand
            <input className="input" name="brand" required />
          </label>
          <label className="grid gap-2 text-sm">
            Model
            <input className="input" name="model" required />
          </label>
          <label className="grid gap-2 text-sm">
            Warranty
            <select className="input" name="warrantyStatus">
              <option value="unknown">Unknown</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
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
        {busy ? "Creating…" : "Create service job"}
      </Button>
    </form>
  );
}
