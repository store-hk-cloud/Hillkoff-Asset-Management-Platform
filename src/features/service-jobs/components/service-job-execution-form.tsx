"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { saveServiceJobDraft } from "@/features/service-jobs/services/service-job-offline.service";
export function ServiceJobExecutionForm({
  jobId,
  version,
}: {
  jobId: string;
  version: number;
}) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        await saveServiceJobDraft({
          key: `execution:${jobId}`,
          jobId,
          serverVersion: version,
          payload: {
            rootCause: data.get("rootCause"),
            solution: data.get("solution"),
          },
        });
        setMessage("บันทึกร่างงานอย่างปลอดภัย รอเชื่อมข้อมูล");
      }}
    >
      <label className="grid gap-2 text-sm">
        สาเหตุหลัก
        <textarea className="input min-h-24" name="rootCause" required />
      </label>
      <label className="grid gap-2 text-sm">
        วิธีแก้ไข
        <textarea className="input min-h-24" name="solution" required />
      </label>
      <Button type="submit">บันทึกร่างงานหน้างาน</Button>
      {message ? (
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {message}
        </p>
      ) : null}
    </form>
  );
}
