export const WAREHOUSES = [
  {
    id: "ENG-SPT",
    nameTh: "คลังอะไหล่ใหม่",
    nameEn: "New spare parts warehouse",
  },
  { id: "ENG", nameTh: "คลังช่าง", nameEn: "Engineering warehouse" },
  {
    id: "FAC-EXP",
    nameTh: "ที่เก็บสินค้าส่งคืน Supplier",
    nameEn: "Supplier return storage",
  },
  {
    id: "FAC-STORE",
    nameTh: "โรงงานวังสิงห์คำ คลังสินค้า",
    nameEn: "Wang Sing Kham factory warehouse",
  },
  { id: "HK1", nameTh: "Hillkoff 1", nameEn: "Hillkoff 1" },
  {
    id: "HK1-SW",
    nameTh: "คลังหน้าร้าน HK1 เครื่องเบิกโชว์หน้าร้าน",
    nameEn: "HK1 showroom warehouse",
  },
  { id: "HQ", nameTh: "ที่เก็บสินค้าหลัก HQ", nameEn: "HQ main warehouse" },
  { id: "MHD", nameTh: "มหิดล", nameEn: "Mahidol" },
  { id: "MKT", nameTh: "การตลาดเพื่อออกบู๊ท", nameEn: "Marketing event stock" },
  { id: "RAT", nameTh: "โกดัง Ratika", nameEn: "Ratika warehouse" },
  { id: "SME", nameTh: "SME", nameEn: "SME" },
  { id: "Z03", nameTh: "คลังบ้านเช่า 2", nameEn: "Rental house warehouse 2" },
  { id: "TDP", nameTh: "ที่เก็บทับเดื่อ", nameEn: "Thap Duea storage" },
] as const;

export const WAREHOUSE_IDS = [
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
] as const;

export type WarehouseId = (typeof WAREHOUSE_IDS)[number];

export function isWarehouseId(value: string): value is WarehouseId {
  return WAREHOUSES.some((warehouse) => warehouse.id === value);
}

export function findWarehouse(warehouseId: string | null | undefined) {
  return WAREHOUSES.find((warehouse) => warehouse.id === warehouseId) ?? null;
}

export function getWarehouseName(warehouseId: WarehouseId): string {
  return findWarehouse(warehouseId)?.nameTh ?? warehouseId;
}
