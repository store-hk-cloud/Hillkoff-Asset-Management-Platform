import type { Entity } from "@/domain/entities/entity";
import type { EntityId } from "@/domain/value-objects/entity-id";

export interface Repository<
  TEntity extends Entity<TId>,
  TId extends EntityId = EntityId,
> {
  findById(id: TId): Promise<TEntity | null>;
  save(entity: TEntity): Promise<void>;
  delete(id: TId): Promise<void>;
}
