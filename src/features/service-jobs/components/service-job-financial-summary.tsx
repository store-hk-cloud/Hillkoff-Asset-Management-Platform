import type { ServiceJobAssessmentTotals } from "@/domain/entities/service-job";
export function ServiceJobFinancialSummary({
  totals,
  locale = "en",
}: {
  totals: ServiceJobAssessmentTotals;
  locale?: "th" | "en";
}) {
  const money = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: "THB",
  });
  const rows = [
    ["Service", totals.serviceSubtotalSatang],
    ["Parts", totals.partsSubtotalSatang],
    ["Discount", -totals.discountSatang],
    ["VAT", totals.vatSatang],
    ["Withholding", -totals.withholdingSatang],
    ["Deposit", -totals.depositSatang],
  ] as const;
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div className="flex justify-between gap-4" key={label}>
          <dt>{label}</dt>
          <dd>{money.format(value / 100)}</dd>
        </div>
      ))}
      <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold">
        <dt>Total due</dt>
        <dd>{money.format(totals.totalDueSatang / 100)}</dd>
      </div>
    </dl>
  );
}
