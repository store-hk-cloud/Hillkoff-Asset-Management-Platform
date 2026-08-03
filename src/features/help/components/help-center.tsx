"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Boxes,
  CalendarCog,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  LifeBuoy,
  Search,
  ShieldCheck,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { UserRole } from "@/domain/value-objects/user-role";
import {
  helpCategoryLabels,
  helpCategoryOrder,
  helpGuides,
  helpRoleLabels,
  type HelpCategory,
  type HelpGuide,
  type HelpIconName,
  type HelpLocale,
  type LocalizedText,
} from "@/features/help/help-content";
import { cn } from "@/lib/utils";

const guideIcons: Readonly<Record<HelpIconName, typeof BookOpen>> = {
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

const workflow: readonly LocalizedText[] = [
  { th: "ตรวจบทบาทและงานค้าง", en: "Review role and backlog" },
  { th: "ตรวจเครื่องและลูกค้า", en: "Verify machine and customer" },
  { th: "สร้างหรือเปิดใบงานเดิม", en: "Create or open the source job" },
  { th: "มอบหมายและอนุมัติ", en: "Assign and approve" },
  { th: "ทำงานพร้อมหลักฐาน", en: "Execute with evidence" },
  { th: "ส่งมอบและบันทึกเอกสาร", en: "Handoff and document" },
  { th: "ตรวจประวัติและปิด loop", en: "Review history and close the loop" },
];

type HelpCenterProps = Readonly<{
  role: UserRole;
}>;

export function HelpCenter({ role }: HelpCenterProps) {
  const { locale } = useLanguage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategory | "all">("all");
  const [expandedId, setExpandedId] = useState("start-here");
  const text = (value: LocalizedText) => value[locale];
  const roleLabel = text(helpRoleLabels[role]);

  const availableGuides = useMemo(
    () =>
      helpGuides.filter(
        (guide) => guide.roles.includes("all") || guide.roles.includes(role),
      ),
    [role],
  );
  const availableCategories = helpCategoryOrder.filter((item) =>
    availableGuides.some((guide) => guide.category === item),
  );

  const filteredGuides = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return availableGuides.filter((guide) => {
      if (category !== "all" && guide.category !== category) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        localize(guide.title, locale),
        localize(guide.summary, locale),
        ...guide.steps.flatMap((step) => [
          localize(step.title, locale),
          localize(step.detail, locale),
        ]),
      ]
        .join(" ")
        .toLocaleLowerCase(locale);
      return searchable.includes(normalizedQuery);
    });
  }, [availableGuides, category, locale, query]);

  return (
    <section className="space-y-6" data-help-center="true">
      <div className="from-primary/12 via-background to-background rounded-xl border bg-gradient-to-br p-6 sm:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="text-primary flex items-center gap-2 text-sm font-semibold">
            <BookOpen aria-hidden="true" className="size-4" />
            <span>
              {locale === "th" ? "ศูนย์คู่มือการใช้งาน" : "In-app user guide"}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {locale === "th"
              ? "ทำงานให้ถูกขั้นตอน ตั้งแต่รับเรื่องจนปิดงาน"
              : "Work the right way, from intake to closeout"}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-6 sm:text-base">
            {locale === "th"
              ? "คู่มือนี้อธิบายวิธีใช้งานทุกโมดูลหลักแบบเป็นขั้นตอน พร้อม checklist จุดควบคุม และแนวทางรับมือข้อยกเว้นสำหรับบทบาทของคุณ"
              : "This guide covers every major module with step-by-step instructions, control checklists, and exception handling relevant to your role."}
          </p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span>
              {locale === "th" ? "แสดงสำหรับบทบาท:" : "Showing guides for:"}{" "}
              {roleLabel}
            </span>
            <span>
              {filteredGuides.length} {locale === "th" ? "หัวข้อ" : "guides"}
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "th"
              ? "ภาพรวมขั้นตอนมาตรฐาน"
              : "Standard operating flow"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {workflow.map((item, index) => (
              <div className="flex items-start gap-2" key={item.en}>
                <span className="bg-primary/12 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="text-muted-foreground pt-1 text-xs leading-5">
                  {text(item)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {locale === "th" ? "ค้นหาและกรองคู่มือ" : "Find a guide"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="relative block">
                <span className="sr-only">
                  {locale === "th" ? "ค้นหาคู่มือ" : "Search guides"}
                </span>
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground absolute top-2.5 left-3 size-4"
                />
                <Input
                  className="pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    locale === "th" ? "ค้นหาขั้นตอน..." : "Search steps..."
                  }
                  value={query}
                />
              </label>
              <div className="space-y-1">
                <FilterButton
                  active={category === "all"}
                  label={locale === "th" ? "ทุกหัวข้อ" : "All guides"}
                  onClick={() => setCategory("all")}
                />
                {availableCategories.map((item) => (
                  <FilterButton
                    active={category === item}
                    key={item}
                    label={text(helpCategoryLabels[item])}
                    onClick={() => setCategory(item)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="hidden lg:block">
            <CardHeader>
              <CardTitle className="text-base">
                {locale === "th" ? "จุดควบคุมสำคัญ" : "Critical controls"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ControlPoint
                text={
                  locale === "th"
                    ? "ใช้รายการเดิม ไม่สร้างซ้ำ"
                    : "Use the source record; do not duplicate."
                }
              />
              <ControlPoint
                text={
                  locale === "th"
                    ? "ตรวจตัวตนเครื่องก่อนทำงาน"
                    : "Verify machine identity before work."
                }
              />
              <ControlPoint
                text={
                  locale === "th"
                    ? "บันทึกหลักฐานระหว่างทำงาน"
                    : "Capture evidence during execution."
                }
              />
              <ControlPoint
                text={
                  locale === "th"
                    ? "ปิด loop ที่โมดูลต้นทาง"
                    : "Close the loop in the source module."
                }
              />
            </CardContent>
          </Card>
        </aside>

        <div className="min-w-0 space-y-4">
          {filteredGuides.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground mx-auto mb-3 size-8"
                />
                <p className="font-medium">
                  {locale === "th"
                    ? "ไม่พบคู่มือที่ตรงกับคำค้น"
                    : "No guides match your search"}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {locale === "th"
                    ? "ลองเปลี่ยนคำค้นหรือเลือกทุกหัวข้อ"
                    : "Try a different search or select All guides."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredGuides.map((guide) => (
              <GuideCard
                expanded={expandedId === guide.id}
                guide={guide}
                key={guide.id}
                locale={locale}
                onToggle={() =>
                  setExpandedId((current) =>
                    current === guide.id ? "" : guide.id,
                  )
                }
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function localize(value: LocalizedText, locale: HelpLocale) {
  return value[locale];
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick(): void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      {active ? <span className="bg-primary size-1.5 rounded-full" /> : null}
    </button>
  );
}

function ControlPoint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2
        aria-hidden="true"
        className="text-success mt-0.5 size-4 shrink-0"
      />
      <span className="text-muted-foreground text-xs leading-5">{text}</span>
    </div>
  );
}

function GuideCard({
  expanded,
  guide,
  locale,
  onToggle,
}: {
  expanded: boolean;
  guide: HelpGuide;
  locale: HelpLocale;
  onToggle(): void;
}) {
  const Icon = guideIcons[guide.icon];
  const text = (value: LocalizedText) => value[locale];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-2 px-3 py-3 sm:px-4">
        <button
          aria-controls={`${guide.id}-content`}
          aria-expanded={expanded}
          className="hover:bg-accent/50 flex min-w-0 flex-1 items-start gap-4 rounded-lg px-3 py-2 text-left transition-colors"
          onClick={onToggle}
          type="button"
        >
          <span className="bg-primary/12 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-muted-foreground block text-xs font-medium tracking-wide uppercase">
              {text(helpCategoryLabels[guide.category])}
            </span>
            <span className="mt-1 block text-base font-semibold">
              {text(guide.title)}
            </span>
            <span className="text-muted-foreground mt-1 block text-sm leading-5">
              {text(guide.summary)}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "text-muted-foreground mt-1 size-5 shrink-0 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        <Link
          aria-label={
            locale === "th"
              ? `เปิดคู่มือเต็ม: ${text(guide.title)}`
              : `Open full manual: ${text(guide.title)}`
          }
          className="text-primary hover:bg-primary/8 focus-visible:ring-ring mt-2 flex shrink-0 items-center gap-1 rounded-md px-2 py-2 text-xs font-medium outline-none focus-visible:ring-2"
          href={`/help/${guide.id}`}
        >
          <BookOpen aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">
            {locale === "th" ? "คู่มือเต็ม" : "Full manual"}
          </span>
        </Link>
      </div>

      {expanded ? (
        <div className="border-t" id={`${guide.id}-content`}>
          <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="space-y-6">
              <div className="bg-muted/45 rounded-lg p-4 text-sm leading-6">
                <p className="font-medium">
                  {locale === "th" ? "เป้าหมายของขั้นตอนนี้" : "Outcome"}
                </p>
                <p className="text-muted-foreground mt-1">
                  {text(guide.outcome)}
                </p>
              </div>
              <ol className="space-y-5">
                {guide.steps.map((step, index) => (
                  <li className="relative flex gap-4" key={step.title.en}>
                    <span className="bg-primary text-primary-foreground relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="font-medium">{text(step.title)}</h3>
                      <p className="text-muted-foreground text-sm leading-6">
                        {text(step.detail)}
                      </p>
                      {step.href ? (
                        <Link
                          className="text-primary inline-flex items-center gap-1 pt-1 text-xs font-medium hover:underline"
                          href={step.href}
                        >
                          {locale === "th"
                            ? "เปิดหน้านี้ในระบบ"
                            : "Open this area"}
                          <ArrowRight aria-hidden="true" className="size-3" />
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="space-y-4">
              <div className="bg-success/8 border-success/20 rounded-lg border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2
                    aria-hidden="true"
                    className="text-success size-4"
                  />
                  {locale === "th"
                    ? "Checklist ก่อนจบ"
                    : "Completion checklist"}
                </h3>
                <ul className="mt-3 space-y-2">
                  {guide.checklist.map((item) => (
                    <li
                      className="text-muted-foreground flex gap-2 text-xs leading-5"
                      key={item.en}
                    >
                      <span className="text-success mt-1 size-1.5 shrink-0 rounded-full bg-current" />
                      <span>{text(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-warning/25 bg-warning/8 rounded-lg border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle
                    aria-hidden="true"
                    className="text-warning size-4"
                  />
                  {locale === "th" ? "จุดที่ต้องระวัง" : "Watch-outs"}
                </h3>
                <ul className="mt-3 space-y-2">
                  {guide.cautions.map((item) => (
                    <li
                      className="text-muted-foreground text-xs leading-5"
                      key={item.en}
                    >
                      {text(item)}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
