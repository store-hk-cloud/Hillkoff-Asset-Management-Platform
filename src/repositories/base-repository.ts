import type { Entity } from "@/domain/entities/entity";
import type { Repository } from "@/domain/repositories/repository";
import type { EntityId } from "@/domain/value-objects/entity-id";

export abstract class BaseRepository<
  TEntity extends Entity<TId>,
  TId extends EntityId = EntityId,
> implements Repository<TEntity, TId> {
  abstract findById(id: TId): Promise<TEntity | null>;
  abstract save(entity: TEntity): Promise<void>;
  abstract delete(id: TId): Promise<void>;
}
