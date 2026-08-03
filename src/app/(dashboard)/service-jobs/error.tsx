"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="border-destructive rounded-lg border p-8 text-center">
      <h2 className="font-semibold">
        ไม่สามารถโหลดงานบริการช่างได้ / Service Jobs unavailable
      </h2>
      <button className="mt-4 underline" onClick={reset} type="button">
        ลองใหม่ / Try again
      </button>
    </div>
  );
}
