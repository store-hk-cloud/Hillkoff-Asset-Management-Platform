import { describe, expect, it } from "vitest";

import {
  getWarehouseName,
  isWarehouseId,
  WAREHOUSES,
  WAREHOUSE_IDS,
} from "@/domain/master-data/warehouses";

describe("warehouse master data", () => {
  it("contains exactly the 13 approved warehouses", () => {
    expect(WAREHOUSES).toHaveLength(13);
    expect(WAREHOUSE_IDS).toEqual([
      "ENG-SPT",
      "ENG",
      "FAC-EXP",
      "FAC-STORE",
      "HK1",
      "HK1-SW",
      "HQ",
      "MHD",
      "MKT",
      "RAT",
      "SME",
      "Z03",
      "TDP",
    ]);
  });

  it("does not accept retired branch identifiers", () => {
    expect(isWarehouseId("Pa-Pang")).toBe(false);
    expect(isWarehouseId("Ratika")).toBe(false);
    expect(isWarehouseId("TD")).toBe(false);
    expect(getWarehouseName("Z03")).toBe("คลังบ้านเช่า 2");
  });
});
