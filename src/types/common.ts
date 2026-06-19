export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ReadonlyRecord<TKey extends PropertyKey, TValue> = Readonly<
  Record<TKey, TValue>
>;
