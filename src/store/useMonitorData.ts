import type {
  MonitorDataType,
  MonitorSseEvent,
  MonitorTable,
} from "@/types/monitor";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

const listKeyByDataType = {
  "wh-shipper": "shipperList",
  "wh-provider": "providerList",
  "wh-waybill": "waybillList",
  "wh-nodeflow": "nodeFlowList",
  "wh-request-event": "requestEventList",
  "wh-transport-capacity": "transportCapacityList",
  "wh-exception-warning": "exceptionWarningList",
  "wh-stop-limit-loading": "stopLimitLoadingList",
  "wh-secscreen-summary": "summary"
} as const satisfies Record<MonitorDataType, keyof MonitorTable>;

const summaryKeyByDataType = {
  "wh-shipper": "shipper",
  "wh-provider": "provider",
  "wh-waybill": "wayBill",
} as const;

const initialData: MonitorTable = {
  summary: { wayBill: 0, shipper: 0, provider: 0 },
  shipperList: [],
  providerList: [],
  waybillList: [],
  nodeFlowList: [],
  requestEventList: [],
  transportCapacityList: [],
  exceptionWarningList: [],
  stopLimitLoadingList: [],
};

interface MonitorDataStore extends MonitorTable {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setSnapshot: (payload: MonitorTable) => void;
  applyEvent: (event: MonitorSseEvent) => void;
  updateStore: (payload: Partial<MonitorTable>) => void;
  updateSummary: (
    payload: Record<"provider" | "shipper" | "wayBill", number>,
  ) => void;
}

export const useMonitorData = create<MonitorDataStore>()(
  subscribeWithSelector((set) => {
    const processedEventIds = new Set<string>();

    return {
      ...initialData,
      loading: false,
      setLoading: (loading) => set({ loading }),
      setSnapshot: (payload) => {
        processedEventIds.clear();
        set({ ...payload, loading: false });
      },
      applyEvent: (event) => {

        if(event.dataType === 'wh-secscreen-summary') return
        if (processedEventIds.has(event.eventId)) return;
        processedEventIds.add(event.eventId);

        if (processedEventIds.size > 2000) {
          const oldest = processedEventIds.values().next().value;
          if (oldest) processedEventIds.delete(oldest);
        }

        set((state) => {
          const operation = event.eventType.slice(
            event.eventType.lastIndexOf(":") + 1,
          ) as "created" | "updated" | "deleted";

          

          const listKey = listKeyByDataType[event.dataType];
          
          const currentList = state[listKey] as { id: string }[];
          const existingIndex = currentList.findIndex(
            (item) => item.id === event.data.id,
          );

          let nextList = currentList;
          if (operation === "created") {
            nextList =
              existingIndex === -1
                ? [event.data, ...currentList]
                : currentList.map((item, index) =>
                    index === existingIndex ? event.data : item,
                  );
          } else if (operation === "updated" && existingIndex !== -1) {
            nextList = currentList.map((item, index) =>
              index === existingIndex ? event.data : item,
            );
          } else if (operation === "deleted" && existingIndex !== -1) {
            nextList = currentList.filter((item) => item.id !== event.data.id);
          }

          let summary = state.summary;
          const shouldAdjustSummary =
            (operation === "created" && existingIndex === -1) ||
            operation === "deleted";
          if (shouldAdjustSummary && event.dataType in summaryKeyByDataType) {
            const summaryKey =
              summaryKeyByDataType[
                event.dataType as keyof typeof summaryKeyByDataType
              ];
            const delta = operation === "created" ? 1 : -1;
            summary = {
              ...summary,
              [summaryKey]: Math.max(0, summary[summaryKey] + delta),
            };
          }

          return {
            [listKey]: nextList,
            summary,
          } as Partial<MonitorDataStore>;
        });
      },
      updateStore: (payload) => set(payload),
      updateSummary: (
        payload: Record<"provider" | "shipper" | "wayBill", number>,
      ) => {
        set({
          summary: {
            ...payload,
          },
        });
      },
    };
  }),
);
