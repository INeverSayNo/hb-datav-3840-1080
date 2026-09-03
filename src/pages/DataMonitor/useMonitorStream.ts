import { useEffect, useRef } from "react";
import {
  GetMonitorTable,
  // GetMonitorTableStatics,
} from "@/api/modules/monitorApi";
import { GATEWAY_URL } from "@/axios-config/request";
import { useMonitorData } from "@/store/useMonitorData";
import type {
  MonitorDataType,
  MonitorEventOperation,
  MonitorSseEvent,
} from "@/types/monitor";

// const CLIENT_ID_KEY = "hb-monitor-sse-client-id";
const dataTypes = new Set<MonitorDataType>([
  "wh-shipper",
  "wh-provider",
  "wh-waybill",
  "wh-nodeflow",
  "wh-request-event",
  "wh-transport-capacity",
  "wh-exception-warning",
  "wh-stop-limit-loading",
  "wh-secscreen-summary"
]);
const operations = new Set<MonitorEventOperation>([
  "created",
  "updated",
  "deleted",
]);

// function createClientId() {
//   if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
//   return `monitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
// }

// function getClientId() {
//   try {
//     const saved = window.localStorage.getItem(CLIENT_ID_KEY);
//     if (saved) return saved;
//     const clientId = createClientId();
//     window.localStorage.setItem(CLIENT_ID_KEY, clientId);
//     return clientId;
//   } catch {
//     return createClientId();
//   }
// }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCamelCaseKey(key: string): string {
  if (!key) return key;
  if (/^[A-Z0-9_]+$/.test(key)) return key.toLowerCase();
  return key.charAt(0).toLowerCase() + key.slice(1);
}

function toCamelCaseKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toCamelCaseKeys);
  }
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[toCamelCaseKey(key)] = toCamelCaseKeys(val);
    }
    return result;
  }
  return value;
}

function parseMonitorEvent(raw: string): MonitorSseEvent | null {
  try {
    const start = raw.indexOf("{");
    if (start === -1) return null;
    let depth = 0;
    let end = -1;
    for (let index = start; index < raw.length; index += 1) {
      const char = raw[index];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          end = index;
          break;
        }
      }
    }
    if (end === -1) return null;

    const parseData: any = toCamelCaseKeys(
      JSON.parse(raw.slice(start, end + 1)),
    );


    if (!parseData || !parseData?.data) return null;

    const value = parseData.data;

    if (!isRecord(value) || !isRecord(value.data)) return null;
    if (
      typeof value.eventId !== "string" ||
      typeof value.eventType !== "string" ||
      typeof value.dataType !== "string" ||
      typeof value.data.id !== "string" ||
      !dataTypes.has(value.dataType as MonitorDataType)
    ) {
      return null;
    }

    const separator = value.eventType.lastIndexOf(":");
    const operation = value.eventType.slice(separator + 1);
    if (
      separator < 1 ||
      value.eventType.slice(0, separator) !== value.dataType ||
      !operations.has(operation as MonitorEventOperation)
    ) {
      return null;
    }

    return value as MonitorSseEvent;
  } catch {
    return null;
  }
}

/** Loads the panel snapshot, then keeps it current through an SSE connection. */
export function useMonitorStream() {
  const setLoading = useMonitorData((state) => state.setLoading);
  const setSnapshot = useMonitorData((state) => state.setSnapshot);
  const applyEvent = useMonitorData((state) => state.applyEvent);
  const updateSummary = useMonitorData((state) => state.updateSummary);
  const lastEventIdRef = useRef("");

  useEffect(() => {
    let disposed = false;
    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    // const clientId = getClientId();

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== null) return;
      const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempts);
      reconnectAttempts += 1;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed) return;
      const url = new URL(
        `/api/resource/wh_screen/subscribe/monitor-wh`,
        GATEWAY_URL,
      );
      if (lastEventIdRef.current) {
        url.searchParams.set("lastEventId", lastEventIdRef.current);
      }

      source = new EventSource(url.toString());
      source.onopen = () => {
        reconnectAttempts = 0;
      };
      source.onmessage = async (message) => {
        const event = parseMonitorEvent(message.data);
        if (!event) {
          console.warn("Ignored malformed monitor SSE event", message.data);
          return;
        }
        applyEvent(event);
        if(event.dataType === 'wh-secscreen-summary') {
          updateSummary(event.data)
        }
        lastEventIdRef.current = event.eventId;
        // const [staticsErr, staticsData] = await GetMonitorTableStatics();
        // if (!staticsErr && staticsData) {
        //   updateSummary(staticsData);
        // }
      };
      source.onerror = () => {
        source?.close();
        source = null;
        scheduleReconnect();
      };
    };

    const bootstrap = async () => {
      setLoading(true);
      const [error, response] = await GetMonitorTable();
      if (!disposed) {
        if (!error && response) {
          setSnapshot(response);
        } else {
          setLoading(false);
          if (error) console.error("Failed to load monitor snapshot", error);
        }
        connect();
      }
    };

    void bootstrap();

    return () => {
      disposed = true;
      source?.close();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    };
  }, [applyEvent, setLoading, setSnapshot]);
}
