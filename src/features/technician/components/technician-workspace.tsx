"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ClipboardList,
  History,
  Radio,
  ScanLine,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type {
  TechnicianWorkItem,
  TechnicianWorkspace as Workspace,
} from "@/domain/entities/technician-work";
import { scanNfcUrl } from "@/features/asset-identity/services/nfc.service";
import {
  lookupTechnicianWork,
  respondToServiceJobAssignment,
  respondToTechnicianWork,
} from "@/features/technician/services/technician-api.service";
import { thaiPrimary } from "@/lib/i18n/thai-primary";

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
  const [search, setSearch] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState<
    TechnicianWorkItem["type"] | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "on_time">(
    "all",
  );

  const filterOptions = {
    search,
    workType: workTypeFilter,
    status: statusFilter,
    due: dueFilter,
  } as const;

  async function respond(
    item: TechnicianWorkItem,
    action: "accept" | "reject",
  ) {
    let reason = "";
    if (action === "reject") {
      reason =
        window.prompt(
          thaiPrimary(locale, "ระบุเหตุผลที่ปฏิเสธงาน", "Rejection reason"),
        ) ?? "";
      if (!reason.trim()) return;
    }
    setBusyId(item.id);
    setError(null);
    try {
      if (item.type === "service_job") {
        if (!item.assignmentId) {
          throw new Error("ไม่พบข้อมูลการมอบหมายใบงานช่าง");
        }
        await respondToServiceJobAssignment(item.id, item.assignmentId, {
          expectedVersion: item.version,
          action,
          reason,
        });
      } else {
        await respondToTechnicianWork(item.type, item.id, {
          expectedVersion: item.version,
          action,
          reason,
        });
      }
      router.refresh();
    } catch (responseError) {
      setError(
        responseError instanceof Error
          ? responseError.message
          : thaiPrimary(
              locale,
              "ไม่สามารถตอบรับงานได้",
              "Unable to answer assignment.",
            ),
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
          thaiPrimary(
            locale,
            "ไม่พบงานของคุณสำหรับเครื่องนี้",
            "No assigned work found for this machine.",
          ),
        );
      } else {
        setError(
          thaiPrimary(
            locale,
            "พบหลายงาน กรุณาเลือกจากรายการงาน",
            "Multiple jobs found. Select one from your work list.",
          ),
        );
      }
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : thaiPrimary(locale, "ค้นหางานไม่สำเร็จ", "Lookup failed."),
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
        scanError instanceof Error
          ? scanError.message
          : thaiPrimary(locale, "สแกน NFC ไม่สำเร็จ", "NFC scan failed."),
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
          label={thaiPrimary(locale, "งานใหม่", "New assignments")}
          value={workspace.newCount}
        />
        <Metric
          icon={<ScanLine className="size-5" />}
          label={thaiPrimary(locale, "กำลังดำเนินการ", "In progress")}
          value={workspace.inProgressCount}
        />
        <Metric
          icon={<AlertTriangle className="size-5" />}
          label={thaiPrimary(locale, "เกินกำหนด", "Overdue")}
          value={workspace.overdueCount}
        />
      </div>

      <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={scan}>
        <div className="relative flex-1">
          <ScanLine className="text-muted-foreground absolute top-3 left-3 size-4" />
          <Input
            className="pl-9"
            onChange={(event) => setReference(event.currentTarget.value)}
            placeholder={thaiPrimary(
              locale,
              "สแกน QR/NFC หรือกรอกหมายเลขเครื่อง",
              "Scan QR/NFC or enter serial number",
            )}
            required
            value={reference}
          />
        </div>
        <Button type="submit">{thaiPrimary(locale, "เปิดงาน", "Open")}</Button>
        <Button
          disabled={scanning}
          onClick={() => void scanNfc()}
          type="button"
          variant="outline"
        >
          <Radio className="size-4" />
          {thaiPrimary(locale, "แตะ NFC", "Scan NFC")}
        </Button>
      </form>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <section
        aria-label="ค้นหาและกรองงานช่าง"
        className="border-border/70 bg-card grid gap-3 rounded-xl border p-4 shadow-sm md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]"
      >
        <div className="relative">
          <Search
            aria-hidden="true"
            className="text-muted-foreground absolute top-3 left-3 size-4"
          />
          <Input
            aria-label="ค้นหางานช่าง"
            className="pl-9"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="ค้นหาเลขที่งาน ลูกค้า หรือเครื่อง"
            type="search"
            value={search}
          />
        </div>
        <Select
          aria-label="กรองประเภทงาน"
          onChange={(event) =>
            setWorkTypeFilter(
              event.currentTarget.value as TechnicianWorkItem["type"] | "all",
            )
          }
          value={workTypeFilter}
        >
          <option value="all">ประเภทงาน: ทั้งหมด</option>
          <option value="repair">งานซ่อม</option>
          <option value="pm">งานบำรุงรักษา PM</option>
          <option value="installation">งานติดตั้ง</option>
          <option value="service_job">ใบงานช่าง</option>
        </Select>
        <Select
          aria-label="กรองสถานะงาน"
          onChange={(event) => setStatusFilter(event.currentTarget.value)}
          value={statusFilter}
        >
          <option value="all">สถานะ: ทั้งหมด</option>
          <option value="pending">รอรับงาน</option>
          <option value="accepted">รับงานแล้ว</option>
          <option value="in_progress">กำลังดำเนินการ</option>
          <option value="waiting_parts">รออะไหล่</option>
          <option value="completed">เสร็จสิ้น</option>
          <option value="closed">ปิดงาน</option>
          <option value="cancelled">ยกเลิก</option>
          <option value="rejected">ปฏิเสธงาน</option>
        </Select>
        <Select
          aria-label="กรองกำหนดเวลา"
          onChange={(event) =>
            setDueFilter(event.currentTarget.value as typeof dueFilter)
          }
          value={dueFilter}
        >
          <option value="all">กำหนดเวลา: ทั้งหมด</option>
          <option value="overdue">เกินกำหนด</option>
          <option value="on_time">ยังไม่เกินกำหนด</option>
        </Select>
      </section>

      <WorkSection
        busyId={busyId}
        empty={thaiPrimary(locale, "ไม่มีงานวันนี้", "No work today")}
        emptyIcon={ClipboardList}
        items={filterWorkItems(workspace.today, filterOptions)}
        locale={locale}
        onRespond={respond}
        readOnly={readOnly}
        title={thaiPrimary(locale, "งานวันนี้", "Today")}
      />
      <WorkSection
        busyId={busyId}
        empty={thaiPrimary(locale, "ไม่มีงานค้าง", "No active work")}
        emptyIcon={ScanLine}
        items={filterWorkItems(workspace.active, filterOptions)}
        locale={locale}
        onRespond={respond}
        readOnly={readOnly}
        title={thaiPrimary(locale, "งานทั้งหมดของฉัน", "My active work")}
      />
      <WorkSection
        busyId={busyId}
        empty={thaiPrimary(locale, "ยังไม่มีประวัติ", "No history")}
        emptyIcon={History}
        icon={<History className="size-5" />}
        items={filterWorkItems(workspace.history, filterOptions)}
        locale={locale}
        onRespond={respond}
        readOnly={readOnly}
        title={thaiPrimary(locale, "ประวัติงาน", "Work history")}
      />
    </div>
  );
}

type WorkFilterOptions = {
  search: string;
  workType: TechnicianWorkItem["type"] | "all";
  status: string;
  due: "all" | "overdue" | "on_time";
};

function filterWorkItems(
  items: readonly TechnicianWorkItem[],
  options: WorkFilterOptions,
): readonly TechnicianWorkItem[] {
  const normalizedSearch = options.search.trim().toLocaleLowerCase("th-TH");

  return items.filter((item) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        item.number,
        item.title,
        item.assetCode,
        item.assetName,
        item.workStatus,
        item.assignedTechnicianName,
      ].some((value) =>
        value.toLocaleLowerCase("th-TH").includes(normalizedSearch),
      );
    const matchesType =
      options.workType === "all" || item.type === options.workType;
    const matchesStatus =
      options.status === "all" ||
      item.workStatus === options.status ||
      item.assignmentStatus === options.status;
    const matchesDue =
      options.due === "all" ||
      (options.due === "overdue" ? item.overdue : !item.overdue);

    return matchesSearch && matchesType && matchesStatus && matchesDue;
  });
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
  emptyIcon = ClipboardList,
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
  emptyIcon?: LucideIcon;
  readOnly: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h2>
      {items.length === 0 ? (
        <EmptyState icon={emptyIcon} message={empty} />
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
                  <StatusBadge>{typeLabel(item.type, locale)}</StatusBadge>
                  <StatusBadge>{item.workStatus}</StatusBadge>
                  {item.overdue ? (
                    <StatusBadge tone="danger">
                      {thaiPrimary(locale, "เกินกำหนด", "Overdue")}
                    </StatusBadge>
                  ) : null}
                </div>
                {item.assignmentStatus === "pending" && !readOnly ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      disabled={busyId === item.id}
                      onClick={() => void onRespond(item, "reject")}
                      variant="outline"
                    >
                      {thaiPrimary(locale, "ปฏิเสธ", "Reject")}
                    </Button>
                    <Button
                      disabled={busyId === item.id}
                      onClick={() => void onRespond(item, "accept")}
                    >
                      {thaiPrimary(locale, "รับงาน", "Accept")}
                    </Button>
                  </div>
                ) : (
                  <Button asChild className="w-full" variant="outline">
                    <Link href={item.href}>
                      {thaiPrimary(locale, "เปิดรายละเอียด", "Open details")}
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
    repair: ["งานซ่อม", "Repair"],
    pm: ["งานบำรุงรักษา PM", "Preventive maintenance (PM)"],
    installation: ["งานติดตั้ง", "Installation"],
    service_job: ["ใบงานช่าง", "ใบงานช่าง"],
  } as const;
  const [thai, english] = labels[type];
  return thaiPrimary(locale, thai, english);
}
