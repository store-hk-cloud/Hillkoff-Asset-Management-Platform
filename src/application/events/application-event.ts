export interface ApplicationEvent {
  readonly id: string;
  readonly type: string;
  readonly aggregateId: string;
  readonly actorId: string;
  readonly occurredAt: Date;
  readonly correlationId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}
