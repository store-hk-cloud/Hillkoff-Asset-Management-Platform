import type { EntityId } from "@/domain/value-objects/entity-id";

export interface DomainEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly eventName: string;
  readonly aggregateId: EntityId;
  readonly aggregateType: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
  readonly version: number;
}
