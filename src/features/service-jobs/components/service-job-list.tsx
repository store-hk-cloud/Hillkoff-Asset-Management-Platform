"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useLanguage } from "@/components/providers/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceJobWorkType } from "@/domain/entities/service-job";
import { ServiceJobStatusBadge } from "@/features/service-jobs/components/service-job-status-badge";
import {
  listServiceJobs,
  type ServiceJobListItem,
} from "@/features/service-jobs/services/service-job-api.service";
import { thaiPrimary } from "@/lib/i18n/thai-primary";

export function ServiceJobList({
  canCreate,
  initialWorkType = "all",
}: {
  canCreate: boolean;
  initialWorkType?: ServiceJobWorkType | "all";
}) {
  const { locale } = useLanguage();
  const [jobs, setJobs] = useState<readonly ServiceJobListItem[]>([]);
  const [status, setStatus] = useState("all");
  const [workType, setWorkType] = useState<ServiceJobWorkType | "all">(
    initialWorkType,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (workType !== "all") params.set("workType", workType);
    listServiceJobs(params.toString())
      .then((items) => {
        if (active) setJobs(items);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : thaiPrimary(
                  locale,
                  "โหลดรายการใบงานช่างไม่สำเร็จ",
                  "โหลดรายการใบงานช่างไม่สำเร็จ",
                ),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [locale, status, workType]);

  return (
    <section className="space-y-6">
      <PageHeader
        action={
          canCreate ? (
            <Link className="primary-button" href="/service-jobs/new">
              สร้างใบงานช่าง
            </Link>
          ) : undefined
        }
        description="รวมคิวงานซ่อม งานติดตั้ง และทดสอบเครื่องใหม่ไว้ในระบบกลาง"
        eyebrow="Service Jobs"
        title="Service Jobs"
      />
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="กรองใบงานช่าง"
      >
        {(
          [
            "all",
            "received",
            "scheduled",
            "assigned",
            "in_progress",
            "assessment_pending",
            "completed",
          ] as const
        ).map((value) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm ${status === value ? "bg-primary text-primary-foreground" : "bg-background"}`}
            key={value}
            onClick={() => setStatus(value)}
            type="button"
          >
            {statusLabel(value)}
          </button>
        ))}
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="กรองประเภทงานช่าง"
      >
        {(["all", "repair", "installation", "new_machine_test"] as const).map(
          (value) => (
            <button
              className={`rounded-md border px-3 py-2 text-sm ${workType === value ? "bg-primary text-primary-foreground" : "bg-background"}`}
              key={value}
              onClick={() => setWorkType(value)}
              type="button"
            >
              {workTypeLabel(value)}
            </button>
          ),
        )}
      </div>
      {loading ? (
        <div aria-live="polite" className="rounded-lg border p-8 text-center">
          กำลังโหลดใบงานช่าง…
        </div>
      ) : error ? (
        <div
          className="border-destructive text-destructive rounded-lg border p-8 text-center"
          role="alert"
        >
          {error}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState icon={ClipboardList} message="ไม่พบใบงานช่างตามตัวกรอง" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <Link href={`/service-jobs/${job.id}`} key={job.id}>
              <Card className="hover:border-primary h-full transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <ServiceJobStatusBadge status={job.status} />
                  </div>
                  <p className="text-muted-foreground font-mono text-xs">
                    {job.jobNumber}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>{job.customerName}</p>
                  <p className="text-muted-foreground">{job.assetLabel}</p>
                  <p className="text-muted-foreground text-xs">
                    {workTypeLabel(job.workType)} ·{" "}
                    {fulfillmentLabel(job.fulfillmentMode)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    all: "ทั้งหมด",
    received: "รับเรื่องแล้ว",
    scheduled: "นัดหมายแล้ว",
    assigned: "มอบหมายแล้ว",
    in_progress: "กำลังดำเนินการ",
    assessment_pending: "รอประเมิน",
    completed: "เสร็จสิ้น",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function workTypeLabel(workType: string): string {
  const labels: Record<string, string> = {
    all: "งานทั้งหมด",
    repair: "งานซ่อม",
    installation: "งานติดตั้ง",
    new_machine_test: "ทดสอบเครื่องใหม่",
  };
  return labels[workType] ?? workType.replaceAll("_", " ");
}

function fulfillmentLabel(mode: string): string {
  const labels: Record<string, string> = {
    onsite: "หน้างาน",
    carry_in: "นำเครื่องเข้าศูนย์",
    carrier: "ขนส่ง",
  };
  return labels[mode] ?? mode.replaceAll("_", " ");
}
