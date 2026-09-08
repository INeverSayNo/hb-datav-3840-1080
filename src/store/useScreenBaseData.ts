import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { FirstScreenPanelPatch } from "@/types/monitor";

export interface ScreenBaseData {
  leftTopPanel: {
    freightVolume: number;
    containerCount: number;
    lineCount: number;
  };
  leftMiddlePanel: {
    summary: { sum: number; yoyRate: number };
    items: { month: string; teu: number }[];
  };
  leftBottomPanel: {
    type: number;
    items: { year: string; teu: number; price: number }[];
  }[];
  rightTopPanel: {
    distributionCount: number;
    supplyCount: number;
    requestCount: number;
    waybillCount: number;
    freightVolume: number;
    lineCount: number;
  };
  rightMiddlePanel: {
    parkCount: number;
    stationCount: number;
    portCount: number;
    transportCapacity: number;
    privateLine: number;
    shipCount: number;
    coopPort: string;
    rcr: string;
    airway: string;
  };
  loading: boolean;
  rightBottomPanel: { text1: string; text2: string }[];
  xinjiangCoalRoutes: XinJiangCoalRoutes | null;
}

export interface XinJiangCoalRoutes {
  lines: {
    channelId: string;
    pathName: string;
    realtimeDatas: {
      lineId: string;
      price: number;
      currency: string;
      unit: string;
      transitTime: number;
      transitTimeUnit: string;
      monthlyVolume: number;
      mVolumeUnit: string;
      enRouteVolume: number;
      erVolumeUnit: string;
      completionRate: number;
      id: string;
    }[];
    paths: {
      id: string;
      lineId: string;
      transportType: number;
      origin: string;
      originGeom: { lat: number; lng: number; locationSys: number };
      dest: string;
      destGeom: { lat: number; lng: number; locationSys: number };
      sort: number;
      geom: number[][];
    }[];
    lineId: string;
    transportType: number;
    customerScope: string;
    fleetSize: number;
    fleetSizeUnit: string;
    transitTimeMin: number;
    transitTimeMax: number;
    transitTimeUnit: string;
    priceMin: number;
    priceMax: number;
    priceUnit: string;
    currency: string;
    departureFrequency: number;
    dfUnit: string;
    lossRate: number;
    id: string;
  }[];
  code: string;
  name: string;
  originAreas: string;
  originAreaNames: string;
  destAreas: string;
  destAreaNames: string;
  goodsCodes: string;
  goodsNames: string;
  description: string;
  serviceProvider: string;
  contact: string;
  phone: object;
  goods: { code: string; value: string; children: undefined[] }[];
  id: string;
}

interface ScreenBaseDataStore extends ScreenBaseData {
  loading: boolean; // 请求状态
  updateStore: (payload: Partial<ScreenBaseData>) => void;
  applyFirstScreenEvent: (
    eventId: string,
    payload: FirstScreenPanelPatch,
  ) => void;
}

export const useScreenBaseDataStore = create<ScreenBaseDataStore>()(
  subscribeWithSelector((set) => {
    const processedEventIds = new Set<string>();

    return {
      leftTopPanel: {
        freightVolume: 0,
        containerCount: 0,
        lineCount: 0,
      },
      leftMiddlePanel: {
        summary: { sum: 0, yoyRate: 0 },
        items: [],
      },
      leftBottomPanel: [],
      rightTopPanel: {
        distributionCount: 0,
        supplyCount: 0,
        requestCount: 0,
        waybillCount: 0,
        freightVolume: 0,
        lineCount: 0,
      },
      rightMiddlePanel: {
        parkCount: 0,
        stationCount: 0,
        portCount: 0,
        transportCapacity: 0,
        privateLine: 0,
        shipCount: 0,
        airway: "0",
        coopPort: "0",
        rcr: "0",
      },
      rightBottomPanel: [],
      xinjiangCoalRoutes: null,
      loading: false,
      updateStore: (payload) => set(payload),
      applyFirstScreenEvent: (eventId, payload) => {
        if (processedEventIds.has(eventId)) return;
        processedEventIds.add(eventId);

        if (processedEventIds.size > 2000) {
          const oldest = processedEventIds.values().next().value;
          if (oldest) processedEventIds.delete(oldest);
        }

        set((state) => ({
          
          leftTopPanel: payload.leftTopPanel ?? state.leftTopPanel,
          leftMiddlePanel: payload.leftMiddlePanel ?? state.leftMiddlePanel,
          leftBottomPanel: payload.leftBottomPanel ?? state.leftBottomPanel,
          rightTopPanel: payload.rightTopPanel ?? state.rightTopPanel,
          rightMiddlePanel: payload.rightMiddlePanel ?? state.rightMiddlePanel,
          rightBottomPanel: payload.rightBottomPanel ?? state.rightBottomPanel,
        }));
      },
    };
  }),
);
