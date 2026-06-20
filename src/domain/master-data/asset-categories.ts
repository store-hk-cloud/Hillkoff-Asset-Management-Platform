export const ASSET_CATEGORY_KEYS = [
  "coffee_machine",
  "grinder",
  "blender",
  "milling_machine",
  "roaster",
  "other",
] as const;

export type AssetCategoryKey = (typeof ASSET_CATEGORY_KEYS)[number];

export const ASSET_CATEGORIES: readonly {
  key: AssetCategoryKey;
  nameTh: string;
  nameEn: string;
}[] = [
  { key: "coffee_machine", nameTh: "เครื่องชง", nameEn: "Coffee machine" },
  { key: "grinder", nameTh: "เครื่องบด", nameEn: "Grinder" },
  { key: "blender", nameTh: "เครื่องปั่น", nameEn: "Blender" },
  { key: "milling_machine", nameTh: "เครื่องสี", nameEn: "Milling machine" },
  { key: "roaster", nameTh: "เครื่องคั่ว", nameEn: "Roaster" },
  { key: "other", nameTh: "อื่นๆ", nameEn: "Other" },
];

export function isAssetCategoryKey(value: unknown): value is AssetCategoryKey {
  return ASSET_CATEGORY_KEYS.some((key) => key === value);
}

export function inferAssetCategoryKey(category: string): AssetCategoryKey {
  const normalized = category.trim().toLocaleLowerCase("th-TH");
  const match = ASSET_CATEGORIES.find(
    (item) =>
      item.nameTh.toLocaleLowerCase("th-TH") === normalized ||
      item.nameEn.toLocaleLowerCase("en-US") === normalized,
  );
  return match?.key ?? "other";
}

export function getAssetCategoryName(
  key: AssetCategoryKey,
  locale: "th" | "en" = "th",
): string {
  const category = ASSET_CATEGORIES.find((item) => item.key === key);
  return locale === "th"
    ? (category?.nameTh ?? key)
    : (category?.nameEn ?? key);
}
