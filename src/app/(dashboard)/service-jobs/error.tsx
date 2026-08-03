"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="border-destructive rounded-lg border p-8 text-center">
      <h2 className="font-semibold">ไม่สามารถโหลด Service Jobs ได้</h2>
      <button className="mt-4 underline" onClick={reset} type="button">
        ลองใหม่
      </button>
    </div>
  );
}
