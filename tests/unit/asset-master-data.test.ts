import { describe, expect, it } from "vitest";

import {
  inferAssetCategoryKey,
  getAssetCategoryName,
} from "@/domain/master-data/asset-categories";
import {
  findWarehouse,
  getWarehouseName,
  isWarehouseId,
} from "@/domain/master-data/warehouses";
import {
  buildAssetSearchKeywords,
  buildAssetSearchPrefixes,
} from "@/domain/services/asset-search.service";

describe("Asset master data", () => {
  it("uses the approved stable warehouse IDs", () => {
    expect(isWarehouseId("HK1")).toBe(true);
    expect(isWarehouseId("ENG-SPT")).toBe(true);
    expect(isWarehouseId("Pa-Pang")).toBe(false);
    expect(getWarehouseName("HQ")).toBe("ที่เก็บสินค้าหลัก HQ");
    expect(findWarehouse("RAT")?.nameTh).toBe("โกดัง Ratika");
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
