export interface ApiSuccess<TData> {
  readonly success: true;
  readonly data: TData;
  readonly correlationId: string;
}

export interface ApiFailure<TDetails = unknown> {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: TDetails;
  };
  readonly correlationId: string;
}

export type ApiResponse<TData, TDetails = unknown> =
  | ApiSuccess<TData>
  | ApiFailure<TDetails>;
