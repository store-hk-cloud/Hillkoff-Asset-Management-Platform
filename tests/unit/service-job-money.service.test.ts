import { describe, expect, it } from "vitest";

import type { ServiceJobAssessmentLine } from "@/domain/entities/service-job";
import { ServiceJobError } from "@/domain/errors/service-job.error";
import { calculateAssessmentTotals } from "@/domain/services/service-job-money.service";

function line(
  overrides: Partial<ServiceJobAssessmentLine> = {},
): ServiceJobAssessmentLine {
  return {
    id: "line-1",
    code: "SERVICE",
    type: "service",
    description: "On-site diagnosis",
    unit: "job",
    quantity: 1,
    unitPriceSatang: 10000,
    discountBasisPoints: 0,
    discountReason: null,
    warehouseId: null,
    warrantyMonths: 0,
    ...overrides,
  };
}

describe("calculateAssessmentTotals", () => {
  it("rounds an exact half satang upward", () => {
    const totals = calculateAssessmentTotals(
      [line({ unitPriceSatang: 1, discountBasisPoints: 5000 })],
      {
        kind: "manual",
        vatBasisPoints: 0,
        withholdingBasisPoints: 0,
        depositBasisPoints: 0,
      },
    );

    expect(totals.discountSatang).toBe(1);
    expect(totals.taxableAmountSatang).toBe(0);
  });

  it("rounds each discounted line deterministically in satang and splits service from parts", () => {
    const totals = calculateAssessmentTotals(
      [
        line({ id: "service", quantity: 3, unitPriceSatang: 3333 }),
        line({
          id: "part",
          type: "part",
          quantity: 1,
          unitPriceSatang: 1000,
          discountBasisPoints: 1000,
        }),
      ],
      {
        kind: "out_of_warranty",
        vatBasisPoints: 700,
        withholdingBasisPoints: 300,
        depositBasisPoints: 3000,
      },
    );

    expect(totals.serviceSubtotalSatang).toBe(9999);
    expect(totals.partsSubtotalSatang).toBe(1000);
    expect(totals.discountSatang).toBe(100);
    expect(totals.taxableAmountSatang).toBe(10899);
    expect(totals.vatSatang).toBe(763);
    expect(totals.withholdingSatang).toBe(327);
    expect(totals.depositSatang).toBe(3270);
    expect(totals.totalDueSatang).toBe(8065);
  });

  it("allows a justified 100 percent discount and produces a zero charge", () => {
    const totals = calculateAssessmentTotals(
      [
        line({
          unitPriceSatang: 200000,
          discountBasisPoints: 10000,
          discountReason: "Active warranty covers a new machine test.",
        }),
      ],
      {
        kind: "no_charge_in_warranty",
        vatBasisPoints: 700,
        withholdingBasisPoints: 300,
        depositBasisPoints: 3000,
      },
    );

    expect(totals.discountSatang).toBe(200000);
    expect(totals.vatSatang).toBe(0);
    expect(totals.withholdingSatang).toBe(0);
    expect(totals.depositSatang).toBe(0);
    expect(totals.totalDueSatang).toBe(0);
  });

  it("rejects an unexplained full discount", () => {
    expect(() =>
      calculateAssessmentTotals(
        [line({ discountBasisPoints: 10000, discountReason: null })],
        {
          kind: "manual",
          vatBasisPoints: 700,
          withholdingBasisPoints: 300,
          depositBasisPoints: 3000,
        },
      ),
    ).toThrowError(ServiceJobError);
  });

  it("rejects totals that exceed the safe integer monetary range", () => {
    const action = () =>
      calculateAssessmentTotals(
        [
          line({ id: "line-1", unitPriceSatang: Number.MAX_SAFE_INTEGER }),
          line({ id: "line-2", unitPriceSatang: Number.MAX_SAFE_INTEGER }),
        ],
        {
          kind: "manual",
          vatBasisPoints: 0,
          withholdingBasisPoints: 0,
          depositBasisPoints: 0,
        },
      );

    expect(action).toThrowError(ServiceJobError);
    try {
      action();
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceJobError);
      expect((error as ServiceJobError).code).toBe("INVALID_MONEY_VALUE");
    }
  });

  it("rejects a combined tax, withholding, and deposit policy with a negative due", () => {
    const action = () =>
      calculateAssessmentTotals([line({ unitPriceSatang: 10000 })], {
        kind: "manual",
        vatBasisPoints: 0,
        withholdingBasisPoints: 10000,
        depositBasisPoints: 10000,
      });

    expect(action).toThrowError(ServiceJobError);
    try {
      action();
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceJobError);
      expect((error as ServiceJobError).code).toBe("INVALID_MONEY_VALUE");
    }
  });
});
