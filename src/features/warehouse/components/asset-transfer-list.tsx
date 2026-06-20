"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AssetTransfer } from "@/domain/entities/asset-transfer";
import type { UserRole } from "@/domain/value-objects/user-role";
import { submitTransferAction } from "@/features/warehouse/services/warehouse-api.service";

type Props = Readonly<{
  transfers: readonly AssetTransfer[];
  role: UserRole;
  branchId: string | null;
}>;

export function AssetTransferList({ transfers, role, branchId }: Props) {
  const { locale } = useLanguage();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [verification, setVerification] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const elevated = role === "admin" || role === "warehouse";

  async function act(
    transfer: AssetTransfer,
    action: "dispatch" | "receive" | "cancel" | "reject" | "return",
  ) {
    let body: Record<string, unknown> = {
      expectedVersion: transfer.version,
    };
    if (action === "receive") {
      body = {
        ...body,
        verificationReference: verification[transfer.id] ?? "",
      };
    }
    if (action === "reject") {
      const reason = window.prompt(
        locale === "th" ? "ระบุเหตุผลที่ปฏิเสธรับ" : "Rejection reason",
      );
      if (!reason) return;
      body = { ...body, reason };
    }

    setBusyId(transfer.id);
    setError(null);
    try {
      await submitTransferAction(transfer.id, action, body);
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update transfer.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (transfers.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        {locale === "th" ? "ไม่มีรายการโอน" : "No transfers"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {transfers.map((transfer) => {
        const canSource = elevated || branchId === transfer.sourceBranchId;
        const canDestination =
          elevated || branchId === transfer.destinationBranchId;
        return (
          <Card className="py-0" key={transfer.id}>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{transfer.assetName}</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {transfer.transferNumber} · {transfer.assetCode} ·{" "}
                    {transfer.serialNumber ?? "—"}
                  </p>
                  <p className="mt-2 text-sm">
                    {transfer.sourceLocationName} ({transfer.sourceBranchId})
                    {" → "}
                    {transfer.destinationLocationName} (
                    {transfer.destinationBranchId})
                  </p>
                </div>
                <span className="bg-muted h-fit rounded-full px-3 py-1 text-xs font-medium">
                  {statusLabel(transfer.status, locale)}
                </span>
              </div>

              {transfer.status === "in_transit" && canDestination ? (
                <div className="space-y-2">
                  <div className="relative">
                    <ScanLine className="text-muted-foreground absolute top-3 left-3 size-4" />
                    <Input
                      className="pl-9"
                      onChange={(event) =>
                        setVerification((current) => ({
                          ...current,
                          [transfer.id]: event.currentTarget.value,
                        }))
                      }
                      placeholder={
                        locale === "th"
                          ? "สแกน QR/NFC หรือกรอก Serial Number"
                          : "Scan QR/NFC or enter serial number"
                      }
                      value={verification[transfer.id] ?? ""}
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {transfer.status === "pending_dispatch" && canSource ? (
                  <>
                    <Button
                      disabled={busyId === transfer.id}
                      onClick={() => void act(transfer, "cancel")}
                      variant="outline"
                    >
                      {locale === "th" ? "ยกเลิกรายการ" : "Cancel"}
                    </Button>
                    <Button
                      disabled={busyId === transfer.id}
                      onClick={() => void act(transfer, "dispatch")}
                    >
                      {locale === "th" ? "ยืนยันส่งออก" : "Dispatch"}
                    </Button>
                  </>
                ) : null}
                {transfer.status === "in_transit" && canDestination ? (
                  <>
                    <Button
                      disabled={busyId === transfer.id}
                      onClick={() => void act(transfer, "reject")}
                      variant="outline"
                    >
                      {locale === "th" ? "ปฏิเสธรับ" : "Reject"}
                    </Button>
                    <Button
                      disabled={
                        busyId === transfer.id ||
                        !(verification[transfer.id] ?? "").trim()
                      }
                      onClick={() => void act(transfer, "receive")}
                    >
                      {locale === "th" ? "ยืนยันรับเข้าสต็อก" : "Receive stock"}
                    </Button>
                  </>
                ) : null}
                {transfer.status === "return_in_transit" && canSource ? (
                  <Button
                    disabled={busyId === transfer.id}
                    onClick={() => void act(transfer, "return")}
                  >
                    {locale === "th"
                      ? "ยืนยันรับคืนเข้าสต็อก"
                      : "Receive returned stock"}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function statusLabel(status: AssetTransfer["status"], locale: "th" | "en") {
  const labels = {
    th: {
      pending_dispatch: "รอยืนยันส่ง",
      in_transit: "อยู่ระหว่างขนส่ง",
      received: "รับเข้าสต็อกแล้ว",
      cancelled: "ยกเลิกแล้ว",
      return_in_transit: "อยู่ระหว่างส่งคืน",
      returned: "ต้นทางรับคืนแล้ว",
    },
    en: {
      pending_dispatch: "Pending dispatch",
      in_transit: "In transit",
      received: "Received",
      cancelled: "Cancelled",
      return_in_transit: "Returning to source",
      returned: "Returned to source",
    },
  };
  return labels[locale][status];
}
