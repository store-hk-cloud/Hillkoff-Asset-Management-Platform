"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type FeedbackField = "serviceScore" | "technicianScore" | "timelinessScore";

export function ServiceFeedbackForm({ token }: { token: string }) {
  const [scores, setScores] = useState<Record<FeedbackField, number>>({
    serviceScore: 5,
    technicianScore: 5,
    timelinessScore: 5,
  });
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "submitted" | "error">(
    "idle",
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    try {
      const response = await fetch(
        `/api/public/feedback/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...scores, comment }),
        },
      );
      if (!response.ok) throw new Error("Unable to submit feedback.");
      setState("submitted");
    } catch {
      setState("error");
    }
  }

  if (state === "submitted") {
    return (
      <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        ขอบคุณสำหรับความคิดเห็นของคุณ
      </p>
    );
  }

  return (
    <form
      className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
      onSubmit={submit}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">ประเมินการให้บริการ</h1>
        <p className="text-muted-foreground text-sm">
          ความคิดเห็นของคุณช่วยให้เราปรับปรุงงานบริการช่าง
        </p>
      </div>
      {(
        [
          ["serviceScore", "คุณภาพการบริการ"],
          ["technicianScore", "การทำงานของช่าง"],
          ["timelinessScore", "ความตรงต่อเวลา"],
        ] as const
      ).map(([field, label]) => (
        <label className="block space-y-2 text-sm" key={field}>
          <span className="font-medium">{label}</span>
          <select
            className="input"
            value={scores[field]}
            onChange={(event) =>
              setScores((current) => ({
                ...current,
                [field]: Number(event.target.value),
              }))
            }
          >
            {[5, 4, 3, 2, 1].map((score) => (
              <option key={score} value={score}>
                {score} / 5
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="block space-y-2 text-sm">
        <span className="font-medium">ความคิดเห็นเพิ่มเติม</span>
        <textarea
          className="input min-h-28"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={2000}
        />
      </label>
      {state === "error" && (
        <p className="text-sm text-red-700">
          ลิงก์นี้หมดอายุหรือส่งความคิดเห็นไม่สำเร็จ
        </p>
      )}
      <Button type="submit" disabled={state === "saving"}>
        {state === "saving" ? "กำลังส่ง..." : "ส่งความคิดเห็น"}
      </Button>
    </form>
  );
}
