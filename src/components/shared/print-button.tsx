"use client";

export function PrintButton() {
  return (
    <button
      className="secondary-button rounded-md px-4 py-2 text-sm font-medium"
      onClick={() => window.print()}
      type="button"
    >
      พิมพ์เอกสาร
    </button>
  );
}
