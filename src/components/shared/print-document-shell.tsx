import type { ReactNode } from "react";
export function PrintDocumentShell({
  children,
  title,
  copy = "Original",
}: {
  children: ReactNode;
  title: string;
  copy?: string;
}) {
  return (
    <article className="print-document mx-auto max-w-[210mm] bg-white p-8 text-black shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <header className="mb-8 flex items-start justify-between border-b pb-4">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase">
            Hillkoff Coffee Fixed
          </p>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <span className="text-xs">{copy}</span>
      </header>
      {children}
      <footer className="mt-12 border-t pt-3 text-xs">
        This document is generated from an immutable service-job snapshot.
      </footer>
    </article>
  );
}
