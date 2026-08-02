"use client";

import { AlertTriangle } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";

type RouteErrorProps = Readonly<{
  reset: () => void;
  context: Readonly<{ th: string; en: string }>;
}>;

export function RouteError({ reset, context }: RouteErrorProps) {
  const { locale } = useLanguage();

  return (
    <section
      aria-live="assertive"
      className="rounded-lg border border-dashed p-10 text-center"
      role="alert"
    >
      <AlertTriangle
        aria-hidden="true"
        className="text-destructive mx-auto mb-3 size-8"
      />
      <h2 className="font-semibold">
        {locale === "th"
          ? "ไม่สามารถโหลดข้อมูลได้"
          : "Unable to load this page"}
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        {locale === "th" ? context.th : context.en}
      </p>
      <Button className="mt-4" onClick={reset} type="button">
        {locale === "th" ? "ลองใหม่" : "Try again"}
      </Button>
    </section>
  );
}
