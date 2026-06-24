"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ClipboardList,
  History,
  Radio,
  ScanLine,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  TechnicianWorkItem,
  TechnicianWorkspace as Workspace,
} from "@/domain/entities/technician-work";
import { scanNfcUrl } from "@/features/asset-identity/services/nfc.service";
import {
  lookupTechnicianWork,
  respondToTechnicianWork,
} from "@/features/technician/services/technician-api.service";

export function TechnicianWorkspace({
  workspace,
  readOnly = false,
}: {
  workspace: Workspace;
  readOnly?: boolean;
}) {
  const { locale } = useLanguage();
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(
    item: TechnicianWorkItem,
    action: "accept" | "reject",
  ) {
    let reason = "";
    if (action === "reject") {
      reason =
        window.prompt(
          locale === "th" ? "ระบุเหตุผลที่ปฏิเสธงาน" : "Rejection reason",
        ) ?? "";
      if (!reason.trim()) return;
    }
    setBusyId(item.id);
    setError(null);
    try {
      await respondToTechnicianWork(item.type, item.id, {
        expectedVersion: item.version,
        action,
        reason,
      });
      router.refresh();
    } catch (responseError) {
      setError(
        responseError instanceof Error
          ? responseError.message
          : "Unable to answer assignment.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function openReference(value: string) {
    setError(null);
    try {
      const result = await lookupTechnicianWork(value);
      if (result.work.length === 1) {
        router.push(result.work[0]!.href);
      } else if (result.work.length === 0) {
        setError(
          locale === "th"
            ? "ไม่พบงานของคุณสำหรับทรัพย์สินนี้"
            : "No assigned work found for this asset.",
        );
      } else {
        setError(
          locale === "th"
            ? "พบหลายงาน กรุณาเลือกจากรายการงาน"
            : "Multiple jobs found. Select one from your work list.",
        );
      }
    } catch (lookupError) {
      setError(
        lookupError instanceof Error ? lookupError.message : "Lookup failed.",
      );
    }
  }

  async function scan(event: FormEvent) {
    event.preventDefault();
    await openReference(reference);
  }

  async function scanNfc() {
    setScanning(true);
    setError(null);
    try {
      const tag = await scanNfcUrl();
      setReference(tag.url);
      await openReference(tag.url);
    } catch (scanError) {
      setError(
        scanError instanceof Error ? scanError.message : "NFC scan failed.",
      );
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<ClipboardList className="size-5" />}
          label={locale === "th" ? "งานใหม่" : "New assignments"}
          value={workspace.newCount}
        />
        <Metric
          icon={<ScanLine className="size-5" />}
          label={locale === "th" ? "กำลังทำ" : "In progress"}
          value={workspace.inProgressCount}
        />
        <Metric
          icon={<AlertTriangle className="size-5" />}
          label={locale === "th" ? "เกินกำหนด" : "Overdue"}
          value={workspace.overdueCount}
        />
      </div>

      <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={scan}>
        <div className="relative flex-1">
          <ScanLine className="text-muted-foreground absolute top-3 left-3 size-4" />
          <Input
            className="pl-9"
            onChange={(event) => setReference(event.currentTarget.value)}
            placeholder={
              locale === "th"
                ? "สแกน QR/NFC หรือกรอก Serial Number"
                : "Scan QR/NFC or enter serial number"
            }
            required
            value={reference}
          />
        </div>
        <Button type="submit">{locale === "th" ? "เปิดงาน" : "Open"}</Button>
        <Button
          disabled={scanning}
          onClick={() => void scanNfc()}
          type="button"
          variant="outline"
        >
          <Radio className="size-4" />
          {locale === "th" ? "แตะ NFC" : "Scan NFC"}
        </Button>
      </form>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <WorkSection
        busyId={busyId}
        empty={locale === "th" ? "ไม่มีงานวันนี้" : "No work today"}
        items={workspace.today}
        locale={locale}
        onRespond={respond}
        readOnly={readOnly}
        title={locale === "th" ? "งานวันนี้" : "Today"}
      />
      <WorkSection
        busyId={busyId}
        empty={locale === "th" ? "ไม่มีงานค้าง" : "No active work"}
        items={workspace.active}
        locale={locale}
        onRespond={respond}
        readOnly={readOnly}
        title={locale === "th" ? "งานทั้งหมดของฉัน" : "My active work"}
      />
      <WorkSection
        busyId={busyId}
        empty={locale === "th" ? "ยังไม่มีประวัติ" : "No history"}
        icon={<History className="size-5" />}
        items={workspace.history}
        locale={locale}
        onRespond={respond}
        readOnly={readOnly}
        title={locale === "th" ? "ประวัติงาน" : "Work history"}
      />
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="bg-primary/10 text-primary rounded-lg p-2">{icon}</div>
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkSection({
  title,
  items,
  empty,
  locale,
  busyId,
  onRespond,
  icon,
  readOnly,
}: {
  title: string;
  items: readonly TechnicianWorkItem[];
  empty: string;
  locale: "th" | "en";
  busyId: string | null;
  onRespond: (
    item: TechnicianWorkItem,
    action: "accept" | "reject",
  ) => Promise<void>;
  icon?: React.ReactNode;
  readOnly: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h2>
      {items.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          {empty}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <Card className="py-0" key={`${item.type}-${item.id}`}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <p className="text-muted-foreground font-mono text-xs">
                  {item.number} · {item.assetCode}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0 text-sm">
                <p>{item.assetName}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-muted rounded-full px-2 py-1">
                    {typeLabel(item.type, locale)}
                  </span>
                  <span className="bg-muted rounded-full px-2 py-1">
                    {item.workStatus}
                  </span>
                  {item.overdue ? (
                    <span className="rounded-full bg-red-100 px-2 py-1 text-red-800">
                      {locale === "th" ? "เกินกำหนด" : "Overdue"}
                    </span>
                  ) : null}
                </div>
                {item.assignmentStatus === "pending" && !readOnly ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      disabled={busyId === item.id}
                      onClick={() => void onRespond(item, "reject")}
                      variant="outline"
                    >
                      {locale === "th" ? "ปฏิเสธ" : "Reject"}
                    </Button>
                    <Button
                      disabled={busyId === item.id}
                      onClick={() => void onRespond(item, "accept")}
                    >
                      {locale === "th" ? "รับงาน" : "Accept"}
                    </Button>
                  </div>
                ) : (
                  <Button asChild className="w-full" variant="outline">
                    <Link href={item.href}>
                      {locale === "th" ? "เปิดรายละเอียด" : "Open details"}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function typeLabel(type: TechnicianWorkItem["type"], locale: "th" | "en") {
  const labels = {
    th: { repair: "งานซ่อม", pm: "งาน PM", installation: "งานติดตั้ง" },
    en: { repair: "Repair", pm: "PM", installation: "Installation" },
  };
  return labels[locale][type];
}
