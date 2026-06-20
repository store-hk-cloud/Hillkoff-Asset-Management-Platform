export const BRANCHES = [
  { id: "HK1", nameTh: "ช้างเผือก", nameEn: "Chang Phueak" },
  { id: "Pa-Pang", nameTh: "ป่าแพ่ง", nameEn: "Pa-Pang" },
  { id: "HQ", nameTh: "สำนักงานใหญ่", nameEn: "Head Office" },
  { id: "MHD", nameTh: "มหิดล", nameEn: "Mahidol" },
  { id: "TD", nameTh: "ทับเดื่อ", nameEn: "Thap Duea" },
  { id: "Ratika", nameTh: "ราติก้า", nameEn: "Ratika" },
] as const;

export const BRANCH_IDS = [
  "HK1",
  "Pa-Pang",
  "HQ",
  "MHD",
  "TD",
  "Ratika",
] as const;

export type BranchId = (typeof BRANCH_IDS)[number];

export function isBranchId(value: string): value is BranchId {
  return BRANCHES.some((branch) => branch.id === value);
}

export function findBranch(branchId: string | null | undefined) {
  return BRANCHES.find((branch) => branch.id === branchId) ?? null;
}

export function getBranchLocationName(branchId: BranchId): string {
  return BRANCHES.find((branch) => branch.id === branchId)?.nameTh ?? branchId;
}
