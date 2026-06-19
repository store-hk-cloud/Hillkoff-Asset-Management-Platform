import type { EntityId } from "@/domain/value-objects/entity-id";

export interface Entity<TId extends EntityId = EntityId> {
  readonly id: TId;
  readonly version: number;
}
