import { getServerTranslator } from "@/lib/i18n/server";

export const metadata = { title: "Scope & Terms of Use" };

const sections = [
  { heading: "terms.scope.heading", body: "terms.scope.body" },
  { heading: "terms.data.heading", body: "terms.data.body" },
  { heading: "terms.account.heading", body: "terms.account.body" },
  { heading: "terms.monitoring.heading", body: "terms.monitoring.body" },
  { heading: "terms.prohibited.heading", body: "terms.prohibited.body" },
  { heading: "terms.contact.heading", body: "terms.contact.body" },
] as const;

export default async function TermsPage() {
  const { t } = await getServerTranslator();

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("terms.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("terms.subtitle")}
        </p>
      </div>
      <div className="side-panel space-y-6 p-6">
        {sections.map((section) => (
          <div key={section.heading}>
            <h2 className="font-semibold">{t(section.heading)}</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {t(section.body)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
