"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceJobStatusBadge } from "@/features/service-jobs/components/service-job-status-badge";
import {
  listServiceJobs,
  type ServiceJobListItem,
} from "@/features/service-jobs/services/service-job-api.service";

export function ServiceJobList({ canCreate }: { canCreate: boolean }) {
  const [jobs, setJobs] = useState<readonly ServiceJobListItem[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listServiceJobs(
      status === "all" ? "" : `status=${encodeURIComponent(status)}`,
    )
      .then((items) => {
        if (active) setJobs(items);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load service jobs.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <section className="space-y-6">
      <PageHeader
        action={
          canCreate ? (
            <Link className="primary-button" href="/service-jobs/new">
              Create service job
            </Link>
          ) : undefined
        }
        description="One operational queue for repair, installation, and new-machine testing."
        eyebrow="Service operations"
        title="Service jobs"
      />
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter service jobs"
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
            {value.replaceAll("_", " ")}
          </button>
        ))}
      </div>
      {loading ? (
        <div aria-live="polite" className="rounded-lg border p-8 text-center">
          Loading service jobs…
        </div>
      ) : error ? (
        <div
          className="border-destructive text-destructive rounded-lg border p-8 text-center"
          role="alert"
        >
          {error}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          message="No service jobs match this filter."
        />
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
                    {job.workType} · {job.fulfillmentMode}
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
