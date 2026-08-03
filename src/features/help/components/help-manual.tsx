import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Boxes,
  CalendarCog,
  CheckCircle2,
  ClipboardList,
  LifeBuoy,
  ShieldCheck,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRole } from "@/domain/value-objects/user-role";
import {
  helpCategoryLabels,
  helpRoleLabels,
  type HelpGuide,
  type HelpIconName,
  type HelpLocale,
  type LocalizedText,
} from "@/features/help/help-content";

const guideIcons: Readonly<Record<HelpIconName, LucideIcon>> = {
  book: BookOpen,
  machine: Boxes,
  service: ClipboardList,
  wrench: Wrench,
  calendar: CalendarCog,
  warehouse: Warehouse,
  users: Users,
  shield: ShieldCheck,
  "life-buoy": LifeBuoy,
};

type HelpManualProps = Readonly<{
  guide: HelpGuide;
  locale: HelpLocale;
  nextGuide?: HelpGuide;
  previousGuide?: HelpGuide;
}>;

export function HelpManual({
  guide,
  locale,
  nextGuide,
  previousGuide,
}: HelpManualProps) {
  const Icon = guideIcons[guide.icon];
  const text = (value: LocalizedText) => value[locale];
  const audience = guide.roles.includes("all")
    ? locale === "th"
      ? "ผู้ใช้งานทุกบทบาท"
      : "All user roles"
    : guide.roles
        .map((role) => text(helpRoleLabels[role as UserRole]))
        .join(locale === "th" ? " · " : " · ");
  const primaryHref = guide.steps.find((step) => step.href)?.href;

  return (
    <section
      className="mx-auto max-w-6xl space-y-6"
      data-help-manual={guide.id}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
          href="/help"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {locale === "th" ? "กลับศูนย์รวมคู่มือ" : "Back to guide center"}
        </Link>
        <span className="text-muted-foreground text-xs">
          {locale === "th"
            ? "คู่มือปฏิบัติงานรายส่วน"
            : "Section operating manual"}
        </span>
      </div>

      <div className="from-primary/14 via-background to-background rounded-xl border bg-gradient-to-br p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="bg-primary/12 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0 space-y-2">
              <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
                {text(helpCategoryLabels[guide.category])}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {text(guide.title)}
              </h1>
              <p className="text-muted-foreground max-w-3xl text-sm leading-6 sm:text-base">
                {text(guide.summary)}
              </p>
            </div>
          </div>
          {primaryHref ? (
            <Link className="secondary-button shrink-0" href={primaryHref}>
              {locale === "th" ? "เปิดส่วนงานนี้" : "Open this area"}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </div>
        <div className="text-muted-foreground mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-xs">
          <span>
            <strong className="text-foreground font-medium">
              {locale === "th" ? "ผู้ใช้งาน:" : "Audience:"}
            </strong>{" "}
            {audience}
          </span>
          <span>
            <strong className="text-foreground font-medium">
              {locale === "th" ? "จำนวนขั้นตอน:" : "Steps:"}
            </strong>{" "}
            {guide.steps.length}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {locale === "th"
                  ? "ขั้นตอนปฏิบัติงานมาตรฐาน"
                  : "Standard operating procedure"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-7">
                {guide.steps.map((step, index) => (
                  <li className="relative flex gap-4" key={step.title.en}>
                    <span className="bg-primary text-primary-foreground relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h2 className="font-semibold">{text(step.title)}</h2>
                      <p className="text-muted-foreground text-sm leading-6">
                        {text(step.detail)}
                      </p>
                      {step.href ? (
                        <Link
                          className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
                          href={step.href}
                        >
                          {locale === "th"
                            ? "ไปยังหน้าที่เกี่ยวข้อง"
                            : "Go to related area"}
                          <ArrowRight aria-hidden="true" className="size-3" />
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {locale === "th" ? "ผลลัพธ์ที่ต้องได้" : "Expected outcome"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/45 rounded-lg p-4 text-sm leading-6">
                {text(guide.outcome)}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2
                  aria-hidden="true"
                  className="text-success size-4"
                />
                {locale === "th"
                  ? "Checklist ก่อนส่งต่องาน"
                  : "Handoff checklist"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {guide.checklist.map((item) => (
                  <li className="flex gap-2 text-sm leading-5" key={item.en}>
                    <span className="bg-success mt-2 size-1.5 shrink-0 rounded-full" />
                    <span className="text-muted-foreground">{text(item)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle
                  aria-hidden="true"
                  className="text-warning size-4"
                />
                {locale === "th"
                  ? "ข้อควรระวังและข้อยกเว้น"
                  : "Cautions and exceptions"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {guide.cautions.map((item) => (
                  <li
                    className="text-muted-foreground text-sm leading-6"
                    key={item.en}
                  >
                    {text(item)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>

      <nav
        aria-label={locale === "th" ? "คู่มือถัดไป" : "Manual navigation"}
        className="border-t pt-5"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          {previousGuide ? (
            <ManualNavLink
              direction="previous"
              guide={previousGuide}
              locale={locale}
            />
          ) : (
            <span />
          )}
          {nextGuide ? (
            <ManualNavLink direction="next" guide={nextGuide} locale={locale} />
          ) : null}
        </div>
      </nav>
    </section>
  );
}

function ManualNavLink({
  direction,
  guide,
  locale,
}: {
  direction: "previous" | "next";
  guide: HelpGuide;
  locale: HelpLocale;
}) {
  const text = (value: LocalizedText) => value[locale];
  const isNext = direction === "next";

  return (
    <Link
      className={isNext ? "text-right" : "text-left"}
      href={`/help/${guide.id}`}
    >
      <span className="text-muted-foreground block text-xs">
        {isNext
          ? locale === "th"
            ? "คู่มือถัดไป"
            : "Next manual"
          : locale === "th"
            ? "คู่มือก่อนหน้า"
            : "Previous manual"}
      </span>
      <span className="text-primary mt-1 inline-flex items-center gap-2 text-sm font-medium hover:underline">
        {!isNext ? <ArrowLeft aria-hidden="true" className="size-4" /> : null}
        {text(guide.title)}
        {isNext ? <ArrowRight aria-hidden="true" className="size-4" /> : null}
      </span>
    </Link>
  );
}
