import { describe, expect, it } from "vitest";

import {
  inferAssetCategoryKey,
  getAssetCategoryName,
} from "@/domain/master-data/asset-categories";
import {
  findBranch,
  getBranchLocationName,
  isBranchId,
} from "@/domain/master-data/branches";
import {
  buildAssetSearchKeywords,
  buildAssetSearchPrefixes,
} from "@/domain/services/asset-search.service";

describe("Asset master data", () => {
  it("uses the approved stable branch IDs", () => {
    expect(isBranchId("HK1")).toBe(true);
    expect(isBranchId("Pa-Pang")).toBe(true);
    expect(getBranchLocationName("HQ")).toBe("สำนักงานใหญ่");
    expect(findBranch("Ratika")?.nameTh).toBe("ราติก้า");
  });

  it("maps fixed and custom categories", () => {
    expect(inferAssetCategoryKey("เครื่องชง")).toBe("coffee_machine");
    expect(inferAssetCategoryKey("Custom machine")).toBe("other");
    expect(getAssetCategoryName("roaster", "th")).toBe("เครื่องคั่ว");
  });

  it("builds normalized partial-search prefixes", () => {
    const values = ["HK-001", "Coffee Machine", "SN-001"];
    expect(buildAssetSearchKeywords(values)).toContain("coffee");
    expect(buildAssetSearchPrefixes(values)).toContain("cof");
    expect(buildAssetSearchPrefixes(values)).toContain("sn-0");
  });
});
