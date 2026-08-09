"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ClipboardList, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useLanguage } from "@/components/providers/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ServiceJobStatus, ServiceJobWorkType } from "@/domain/entities/service-job";
import { ServiceJobStatusBadge } from "@/features/service-jobs/components/service-job-status-badge";
import type { ServiceJobSearchCriteria } from "@/features/service-jobs/schemas/service-job.schema";
import {
  listServiceJobs,
  type ServiceJobListItem,
} from "@/features/service-jobs/services/service-job-api.service";
import { thaiPrimary } from "@/lib/i18n/thai-primary";

const STATUS_FILTER_OPTIONS: readonly (ServiceJobStatus | "all")[] = [
  "all",
  "received",
  "scheduled",
  "assigned",
  "in_progress",
  "assessment_pending",
  "completed",
];

const WORK_TYPE_FILTER_OPTIONS: readonly (ServiceJobWorkType | "all")[] = [
  "all",
  "repair",
  "installation",
  "new_machine_test",
];

function buildHref(criteria: ServiceJobSearchCriteria, overrides: Partial<ServiceJobSearchCriteria>) {
  const merged = { ...criteria, ...overrides };
  const params = new URLSearchParams();
  if (merged.status !== "all") params.set("status", merged.status);
  if (merged.workType !== "all") params.set("workType", merged.workType);
  if (merged.limit !== 50) params.set("limit", String(merged.limit));
  const search = params.toString();
  return `/service-jobs${search ? `?${search}` : ""}`;
}

export function ServiceJobList({
  canCreate,
  criteria,
}: {
  canCreate: boolean;
  criteria: ServiceJobSearchCriteria;
}) {
  const { locale } = useLanguage();
  const [jobs, setJobs] = useState<readonly ServiceJobListItem[]>([]);
  const [search, setSearch] = useState(criteria.query);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visibleJobs = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("th-TH");
    if (!normalizedSearch) return jobs;

    return jobs.filter((job) =>
      [
        job.jobNumber,
        job.title,
        job.customerName,
        job.assetLabel,
        job.workType,
        job.fulfillmentMode,
      ].some((value) =>
        value.toLocaleLowerCase("th-TH").includes(normalizedSearch),
      ),
    );
  }, [jobs, search]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (criteria.status !== "all") params.set("status", criteria.status);
    if (criteria.workType !== "all") params.set("workType", criteria.workType);
    params.set("limit", String(criteria.limit));
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
  }, [locale, criteria.status, criteria.workType, criteria.limit]);

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
      <div className="relative max-w-2xl">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-3 left-3 size-4"
        />
        <Input
          aria-label="ค้นหาใบงานช่าง"
          className="pl-9"
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="ค้นหาเลขที่ใบงาน ลูกค้า เครื่อง หรือหัวข้องาน"
          type="search"
          value={search}
        />
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="กรองใบงานช่าง"
      >
        {STATUS_FILTER_OPTIONS.map((value) => (
          <Link
            className={`rounded-md border px-3 py-2 text-sm ${criteria.status === value ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent/40"}`}
            href={buildHref(criteria, { status: value, limit: 50 })}
            key={value}
          >
            {statusLabel(value)}
          </Link>
        ))}
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="กรองประเภทงานช่าง"
      >
        {WORK_TYPE_FILTER_OPTIONS.map((value) => (
          <Link
            className={`rounded-md border px-3 py-2 text-sm ${criteria.workType === value ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent/40"}`}
            href={buildHref(criteria, { workType: value, limit: 50 })}
            key={value}
          >
            {workTypeLabel(value)}
          </Link>
        ))}
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
      ) : visibleJobs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          message={
            search.trim()
              ? "ไม่พบใบงานช่างจากคำค้นหาและตัวกรองที่เลือก"
              : "ไม่พบใบงานช่างตามตัวกรอง"
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {search.trim()
              ? `พบ ${visibleJobs.length} รายการจาก ${jobs.length} ที่โหลดไว้`
              : `แสดง ${jobs.length} รายการ`}
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleJobs.map((job) => (
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
                  <CardContent className="space-y-1 text-sm">
                    <p>{job.customerName}</p>
                    <p className="text-muted-foreground text-xs">
                      {job.assetLabel} · {workTypeLabel(job.workType)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {jobs.length === criteria.limit && criteria.limit < 200 ? (
            <div className="flex justify-center">
              <Link
                className="ghost-button rounded-md border px-4 py-2 text-sm"
                href={buildHref(criteria, { limit: criteria.limit + 50 })}
              >
                โหลดเพิ่ม
              </Link>
            </div>
          ) : jobs.length === criteria.limit ? (
            <p className="text-muted-foreground text-center text-xs">
              แสดงผลสูงสุด {criteria.limit} รายการแล้ว ลองปรับตัวกรองให้แคบลง
            </p>
          ) : null}
        </>
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
