export interface Rsp<T, V = Record<string, never>> {
  data: T;
  multipleData: V;
  multipleMessage: Record<string, unknown>;
  isSuccessful: boolean;
  message: string | number | null;
  code: string | number | null;
}

export interface Rsp8<T, V = Record<string, never>> {
  result: T;
  details: V | null;
  message: string | number | null;
  code: string | number | null;
}

export type ApiErrorKind = "business" | "http" | "network";

export interface ApiErrorOptions<T = unknown> {
  kind: ApiErrorKind;
  code?: string | number | null;
  status?: number | null;
  data?: T | null;
  details?: unknown;
  originalError?: unknown;
}

export class ApiError<T = unknown> extends Error {
  readonly kind: ApiErrorKind;
  readonly code: string | number | null;
  readonly status: number | null;
  readonly data: T | null;
  readonly details: unknown;
  readonly originalError: unknown;

  constructor(message: string, options: ApiErrorOptions<T>) {
    super(message);
    this.name = "ApiError";
    this.kind = options.kind;
    this.code = options.code ?? null;
    this.status = options.status ?? null;
    this.data = options.data ?? null;
    this.details = options.details;
    this.originalError = options.originalError;
  }
}
