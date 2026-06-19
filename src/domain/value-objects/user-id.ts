import type { EntityId } from "@/domain/value-objects/entity-id";
import { createEntityId } from "@/domain/value-objects/entity-id";

declare const userIdBrand: unique symbol;

export type UserId = EntityId & {
  readonly [userIdBrand]: "UserId";
};

export function createUserId(value: string): UserId {
  return createEntityId(value) as UserId;
}
