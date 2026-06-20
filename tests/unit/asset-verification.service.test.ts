import { describe, expect, it } from "vitest";

import type { Asset } from "@/domain/entities/asset";
import { AssetVerificationService } from "@/domain/services/asset-verification.service";

const service = new AssetVerificationService();

function asset(
  input: Pick<Asset, "status" | "custodyType" | "installedAt">,
): Asset {
  return input as Asset;
}

describe("AssetVerificationService", () => {
  it("maps branch custody to in-stock", () => {
    expect(
      service.getOperationalStatus(
        asset({
          status: "active",
          custodyType: "branch",
          installedAt: null,
        }),
      ),
    ).toBe("in_stock");
  });

  it("distinguishes sold from installed customer assets", () => {
    expect(
      service.getOperationalStatus(
        asset({
          status: "active",
          custodyType: "customer",
          installedAt: null,
        }),
      ),
    ).toBe("sold");
    expect(
      service.getOperationalStatus(
        asset({
          status: "active",
          custodyType: "customer",
          installedAt: new Date("2026-06-20T00:00:00.000Z"),
        }),
      ),
    ).toBe("in_use");
  });

  it("gives archived state precedence", () => {
    expect(
      service.getOperationalStatus(
        asset({
          status: "archived",
          custodyType: "customer",
          installedAt: new Date("2026-06-20T00:00:00.000Z"),
        }),
      ),
    ).toBe("archived");
  });
});
