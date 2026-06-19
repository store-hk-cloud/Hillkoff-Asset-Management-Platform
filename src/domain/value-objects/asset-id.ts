import type { EntityId } from "@/domain/value-objects/entity-id";
import { createEntityId } from "@/domain/value-objects/entity-id";

declare const assetIdBrand: unique symbol;

export type AssetId = EntityId & {
  readonly [assetIdBrand]: "AssetId";
};

export function createAssetId(value: string): AssetId {
  return createEntityId(value) as AssetId;
}
