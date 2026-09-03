import type { defineConfig, interceptorsUse } from "@dczy/tie-tools";

import { ApiError } from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCode(value: unknown): string | number | null {
  if (!isRecord(value)) return null;
  const code = value.code;
  return typeof code === "string" || typeof code === "number" ? code : null;
}

function readMessage(value: unknown, fallback: string) {
  if (!isRecord(value)) return fallback;
  const message = value.message;
  return typeof message === "string" || typeof message === "number"
    ? String(message)
    : fallback;
}


function normalizeRejectedError(error: unknown) {
  if (error instanceof ApiError) return error;

  const errorRecord = isRecord(error) ? error : null;
  const response = isRecord(errorRecord?.response)
    ? errorRecord.response
    : null;
  const status = typeof response?.status === "number" ? response.status : null;
  const data = response?.data;
  const code = readCode(data);
  const fallbackMessage =
    typeof errorRecord?.message === "string"
      ? errorRecord.message
      : status
        ? `请求失败（HTTP ${status}）`
        : "网络请求失败";

  return new ApiError(readMessage(data, fallbackMessage), {
    kind: response ? "http" : "network",
    code,
    status,
    data,
    details: isRecord(data)
      ? (data.details ?? data.multipleMessage)
      : undefined,
    originalError: error,
  });
}

export const handleRequestFulfilled: NonNullable<
  interceptorsUse["onRequestFulfilled"]
> = async (config: defineConfig) => config;

export const handleFulfilled: NonNullable<interceptorsUse["onFulfilled"]> = (
  response,
) => {
  const data: unknown = response.data;
  if (!isRecord(data)) return response;

  return response;
};

export const handleRejected: NonNullable<interceptorsUse["onRejected"]> = (
  error,
) => {
  const normalizedError = normalizeRejectedError(error);

  return Promise.reject(normalizedError);
};

export const handleRejecect = handleRejected;
