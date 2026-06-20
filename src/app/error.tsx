"use client";

import { useEffect } from "react";

import { useLanguage } from "@/components/providers/language-provider";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const { t } = useLanguage();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <section className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">{t("error.title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("error.description")}
        </p>
        <button
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
          onClick={reset}
          type="button"
        >
          {t("action.retry")}
        </button>
      </section>
    </main>
  );
}
