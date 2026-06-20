import { getServerTranslator } from "@/lib/i18n/server";

export default async function Loading() {
  const { t } = await getServerTranslator();

  return (
    <main
      className="grid min-h-dvh place-items-center"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-muted-foreground text-sm">{t("status.loading")}</p>
    </main>
  );
}
