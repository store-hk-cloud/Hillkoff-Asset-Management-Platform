"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="border-destructive rounded-lg border p-8 text-center">
      <h2 className="font-semibold">Service operations unavailable</h2>
      <button className="mt-4 underline" onClick={reset} type="button">
        Try again
      </button>
    </div>
  );
}
