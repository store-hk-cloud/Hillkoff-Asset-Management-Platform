import { describe, expect, it } from "vitest";
import { calculateAssessmentTotals } from "@/domain/services/service-job-money.service";

describe("service job document calculations", () => {
  it("keeps the supplied 2,230 THB service/parts split in satang", () => {
    const totals = calculateAssessmentTotals(
      [
        {
          id: "service",
          code: "LABOR",
          type: "service",
          description: "On-site service",
          unit: "job",
          quantity: 1,
          unitPriceSatang: 200_000,
          discountBasisPoints: 0,
          discountReason: null,
          warehouseId: null,
          warrantyMonths: 0,
        },
        {
          id: "part",
          code: "PART",
          type: "part",
          description: "Part",
          unit: "piece",
          quantity: 1,
          unitPriceSatang: 23_000,
          discountBasisPoints: 0,
          discountReason: null,
          warehouseId: null,
          warrantyMonths: 0,
        },
      ],
      {
        kind: "charge_in_warranty",
        vatBasisPoints: 700,
        withholdingBasisPoints: 300,
        depositBasisPoints: 0,
      },
    );
    expect(totals.serviceSubtotalSatang).toBe(200_000);
    expect(totals.partsSubtotalSatang).toBe(23_000);
    expect(totals.subtotalSatang).toBe(223_000);
  });
  it("supports zero-total warranty documents with a mandatory reason", () => {
    const totals = calculateAssessmentTotals(
      [
        {
          id: "w",
          code: "WARRANTY",
          type: "service",
          description: "Warranty",
          unit: "job",
          quantity: 1,
          unitPriceSatang: 223_000,
          discountBasisPoints: 10_000,
          discountReason: "Approved warranty claim",
          warehouseId: null,
          warrantyMonths: 12,
        },
      ],
      {
        kind: "no_charge_in_warranty",
        vatBasisPoints: 0,
        withholdingBasisPoints: 0,
        depositBasisPoints: 0,
      },
    );
    expect(totals.totalDueSatang).toBe(0);
  });
});
