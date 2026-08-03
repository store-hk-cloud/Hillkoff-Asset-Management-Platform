import type { ServiceJobAssessmentTotals } from "@/domain/entities/service-job";
import { thaiPrimary } from "@/lib/i18n/thai-primary";

export function ServiceJobFinancialSummary({
  totals,
  locale = "th",
}: {
  totals: ServiceJobAssessmentTotals;
  locale?: "th" | "en";
}) {
  const money = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: "THB",
  });
  const rows = [
    ["ค่าบริการ", "Service", totals.serviceSubtotalSatang],
    ["ค่าอะไหล่", "Parts", totals.partsSubtotalSatang],
    ["ส่วนลด", "Discount", -totals.discountSatang],
    ["ภาษีมูลค่าเพิ่ม", "VAT", totals.vatSatang],
    ["หักภาษี ณ ที่จ่าย", "Withholding", -totals.withholdingSatang],
    ["เงินมัดจำ", "Deposit", -totals.depositSatang],
  ] as const;
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([thaiLabel, englishLabel, value]) => (
        <div className="flex justify-between gap-4" key={englishLabel}>
          <dt>{thaiPrimary(locale, thaiLabel, englishLabel)}</dt>
          <dd>{money.format(value / 100)}</dd>
        </div>
      ))}
      <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold">
        <dt>{thaiPrimary(locale, "ยอดสุทธิที่ต้องชำระ", "Total due")}</dt>
        <dd>{money.format(totals.totalDueSatang / 100)}</dd>
      </div>
    </dl>
  );
}
