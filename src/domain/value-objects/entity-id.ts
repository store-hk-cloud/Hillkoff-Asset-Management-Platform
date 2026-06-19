declare const entityIdBrand: unique symbol;

export type EntityId = string & {
  readonly [entityIdBrand]: "EntityId";
};

export function createEntityId(value: string): EntityId {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error("Entity ID cannot be empty.");
  }

  return normalizedValue as EntityId;
}
