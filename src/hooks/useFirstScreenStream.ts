import { useEffect, useRef } from "react";
import { GATEWAY_URL } from "@/axios-config/request";
import { useScreenBaseDataStore } from "@/store/useScreenBaseData";
import type {
  FirstScreenPanelPatch,
  FirstScreenSseEvent,
} from "@/types/monitor";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCamelCaseKey(key: string): string {
  if (!key) return key;
  if (/^[A-Z0-9_]+$/.test(key)) return key.toLowerCase();
  return key.charAt(0).toLowerCase() + key.slice(1);
}

function toCamelCaseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCamelCaseKeys);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      toCamelCaseKey(key),
      toCamelCaseKeys(item),
    ]),
  );
}

function normalizeNumberFields(value: unknown, keys: readonly string[]): void {
  if (!isRecord(value)) return;

  for (const key of keys) {
    const current = value[key];
    if (typeof current !== "string" || current.trim() === "") continue;
    const number = Number(current);
    if (Number.isFinite(number)) value[key] = number;
  }
}

function normalizeFirstScreenPatch(data: Record<string, unknown>): void {
  normalizeNumberFields(data.leftTopPanel, [
    "freightVolume",
    "containerCount",
    "lineCount",
  ]);
  normalizeNumberFields(data.rightTopPanel, [
    "distributionCount",
    "supplyCount",
    "requestCount",
    "waybillCount",
    "freightVolume",
    "lineCount",
  ]);
  normalizeNumberFields(data.rightMiddlePanel, [
    "parkCount",
    "stationCount",
    "portCount",
    "transportCapacity",
    "privateLine",
    "shipCount",
  ]);

  if (isRecord(data.leftMiddlePanel)) {
    normalizeNumberFields(data.leftMiddlePanel.summary, ["sum", "yoyRate"]);
    if (Array.isArray(data.leftMiddlePanel.items)) {
      data.leftMiddlePanel.items.forEach((item) => {
        normalizeNumberFields(item, ["teu"]);
      });
    }
  }

  if (Array.isArray(data.leftBottomPanel)) {
    data.leftBottomPanel.forEach((panel) => {
      if (!isRecord(panel) || !Array.isArray(panel.items)) return;
      normalizeNumberFields(panel, ["type"]);
      panel.items.forEach((item) => {
        normalizeNumberFields(item, ["teu", "price"]);
      });
    });
  }
}

function parseFirstScreenEvent(raw: string): FirstScreenSseEvent | null {
  try {
    const parsed = toCamelCaseKeys(JSON.parse(raw));
    if (!isRecord(parsed)) return null;

    // 兼容文档中的扁平事件，以及部分网关使用的 { data: event } 包装。
    const event =
      typeof parsed.eventId === "string"
        ? parsed
        : isRecord(parsed.data)
          ? parsed.data
          : null;

    if (!isRecord(event) || !isRecord(event.data)) return null;
    if (
      typeof event.eventId !== "string" ||
      event.dataType !== "wh-firscreen-summary" ||
      event.eventType !== "wh-firscreen-summary:update"
    ) {
      return null;
    }

    normalizeFirstScreenPatch(event.data);
    return event as unknown as FirstScreenSseEvent;
  } catch {
    return null;
  }
}

/** Loads the first-screen snapshot in Index and keeps its panels current via SSE. */
export function useFirstScreenStream(enabled: boolean) {
  const applyFirstScreenEvent = useScreenBaseDataStore(
    (state) => state.applyFirstScreenEvent,
  );
  const lastEventIdRef = useRef("");

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;

    const connect = () => {
      if (disposed) return;

      const url = new URL(
        "/api/resource/wh_screen/subscribe/monitor-wh",
        GATEWAY_URL,
      );
      if (lastEventIdRef.current) {
        url.searchParams.set("lastEventId", lastEventIdRef.current);
      }

      source = new EventSource(url.toString());
      source.onopen = () => {
        reconnectAttempts = 0;
      };

      source.onmessage = (message) => {
        const event = parseFirstScreenEvent(message.data);
        if (!event) {
          console.warn(
            "Ignored malformed first-screen SSE event",
            message.data,
          );
          return;
        }

        applyFirstScreenEvent(
          event.eventId,
          event.data as FirstScreenPanelPatch,
        );
        lastEventIdRef.current = event.eventId;
      };

      source.onerror = () => {
        source?.close();
        source = null;
        if (disposed || reconnectTimer !== null) return;

        const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempts);
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      source?.close();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    };
  }, [applyFirstScreenEvent, enabled]);
}
