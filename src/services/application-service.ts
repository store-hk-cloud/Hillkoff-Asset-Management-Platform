import type { Result } from "@/lib/result";

export interface ApplicationService<
  TInput,
  TOutput,
  TError extends Error = Error,
> {
  execute(input: TInput): Promise<Result<TOutput, TError>>;
}
