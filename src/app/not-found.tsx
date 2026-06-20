import Link from "next/link";

import { getServerTranslator } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getServerTranslator();

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <section className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
        <Link className="text-sm underline underline-offset-4" href="/">
          {t("notFound.home")}
        </Link>
      </section>
    </main>
  );
}
