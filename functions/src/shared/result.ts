export type FunctionResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly code: string; readonly message: string };
