import type {
  ServiceJobAssessmentLine,
  ServiceJobAssessmentTotals,
  ServiceJobChargePolicy,
} from "@/domain/entities/service-job";
import { ServiceJobError } from "@/domain/errors/service-job.error";

const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);
const BASIS_POINT_DENOMINATOR = 10_000n;
const HALF_BASIS_POINT_DENOMINATOR = 5_000n;

function roundBasisPoints(amountSatang: bigint, basisPoints: number): bigint {
  return (
    (amountSatang * BigInt(basisPoints) + HALF_BASIS_POINT_DENOMINATOR) /
    BASIS_POINT_DENOMINATOR
  );
}

function requireBasisPoints(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new ServiceJobError(
      "INVALID_MONEY_VALUE",
      `${field} must be an integer between 0 and 10000 basis points.`,
    );
  }
}

function requireSatang(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ServiceJobError(
      "INVALID_MONEY_VALUE",
      `${field} must be a non-negative integer satang value.`,
    );
  }
}

function toSafeInteger(value: bigint, field: string): number {
  if (value > MAX_SAFE_INTEGER || value < -MAX_SAFE_INTEGER) {
    throw new ServiceJobError(
      "INVALID_MONEY_VALUE",
      `${field} exceeds the supported monetary range.`,
    );
  }
  return Number(value);
}

export function calculateAssessmentTotals(
  lines: readonly ServiceJobAssessmentLine[],
  policy: ServiceJobChargePolicy,
): ServiceJobAssessmentTotals {
  requireBasisPoints(policy.vatBasisPoints, "VAT");
  requireBasisPoints(policy.withholdingBasisPoints, "Withholding");
  requireBasisPoints(policy.depositBasisPoints, "Deposit");

  let serviceSubtotalSatang = 0n;
  let partsSubtotalSatang = 0n;
  let discountSatang = 0n;

  for (const line of lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      throw new ServiceJobError(
        "INVALID_MONEY_VALUE",
        "Line quantity must be a positive integer.",
      );
    }
    requireSatang(line.unitPriceSatang, "Unit price");
    requireBasisPoints(line.discountBasisPoints, "Line discount");
    if (line.discountBasisPoints === 10_000 && !line.discountReason?.trim()) {
      throw new ServiceJobError(
        "FULL_DISCOUNT_REASON_REQUIRED",
        "A 100% discount requires a reason.",
      );
    }

    const lineSubtotalSatang =
      BigInt(line.quantity) * BigInt(line.unitPriceSatang);
    const lineDiscountSatang = roundBasisPoints(
      lineSubtotalSatang,
      line.discountBasisPoints,
    );

    if (line.type === "service") {
      serviceSubtotalSatang += lineSubtotalSatang;
    } else {
      partsSubtotalSatang += lineSubtotalSatang;
    }
    discountSatang += lineDiscountSatang;
  }

  const subtotalSatang = serviceSubtotalSatang + partsSubtotalSatang;
  const taxableAmountSatang = subtotalSatang - discountSatang;
  const vatSatang = roundBasisPoints(
    taxableAmountSatang,
    policy.vatBasisPoints,
  );
  const withholdingSatang = roundBasisPoints(
    taxableAmountSatang,
    policy.withholdingBasisPoints,
  );
  const depositSatang = roundBasisPoints(
    taxableAmountSatang,
    policy.depositBasisPoints,
  );
  const totalDueSatang =
    taxableAmountSatang + vatSatang - withholdingSatang - depositSatang;
  if (totalDueSatang < 0n) {
    throw new ServiceJobError(
      "INVALID_MONEY_VALUE",
      "Total due cannot be negative.",
    );
  }

  return {
    serviceSubtotalSatang: toSafeInteger(
      serviceSubtotalSatang,
      "Service subtotal",
    ),
    partsSubtotalSatang: toSafeInteger(partsSubtotalSatang, "Parts subtotal"),
    subtotalSatang: toSafeInteger(subtotalSatang, "Subtotal"),
    discountSatang: toSafeInteger(discountSatang, "Discount"),
    taxableAmountSatang: toSafeInteger(taxableAmountSatang, "Taxable amount"),
    vatSatang: toSafeInteger(vatSatang, "VAT"),
    withholdingSatang: toSafeInteger(withholdingSatang, "Withholding"),
    depositSatang: toSafeInteger(depositSatang, "Deposit"),
    totalDueSatang: toSafeInteger(totalDueSatang, "Total due"),
  };
}
