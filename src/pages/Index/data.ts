import type { ScreenBaseData } from "@/store/useScreenBaseData";

export interface OverviewMetric {
  label: string;
  tone: "cyan" | "blue" | "gold";
  unit: string
  key: keyof ScreenBaseData["leftTopPanel"];
}

export interface ServiceMetric {
  unit: string;
  label: string;
  key: keyof ScreenBaseData["rightTopPanel"];
}

export interface NodeMetric {
  label: string;
  key: keyof ScreenBaseData["rightMiddlePanel"];
}

export interface YearSummary {
  year: string;
  volume: string;
  amount: string;
}

export interface RouteItem {
  province: string;
  text: string;
  tone: "blue" | "green" | "gold";
}

export const overviewMetrics: OverviewMetric[] = [
  { label: "多式联运货运量", tone: "cyan", key: "freightVolume", unit: '万吨' },
  { label: "多式联运箱量", tone: "blue", key: "containerCount", unit: '万TEU' },
  { label: "多式联运重点线路", tone: "gold", key: "lineCount", unit: '条' },
];

export const yearSummaries: YearSummary[] = ["2023", "2024", "2025"].map(
  (year) => ({ year, volume: "2546", amount: "2546" }),
);

export const serviceMetrics: ServiceMetric[] = [
  { unit: "家", label: "制造/商贸流通企业", key: "distributionCount" },
  { unit: "家", label: "物流供应链企业", key: "supplyCount" },
  { unit: "单", label: "运输需求数量", key: "requestCount" },
  { unit: "单", label: "运单数量", key: "waybillCount" },
  { unit: "万元", label: "货值", key: "freightVolume" },
  { unit: "条", label: "精品线路", key: "lineCount" },
];

export const nodeMetrics: NodeMetric[] = [
  { key: "airway", label: "航线" },
  { key: "rcr", label: "辐射国家/地区" },
  { key: "coopPort", label: "合作口岸" },

  { key: "parkCount", label: "物流/产业园区" },
  { key: "stationCount", label: "铁路货运站点" },
  { key: "portCount", label: "水运货运港口" },
  { key: "transportCapacity", label: "公路运力" },
  { key: "privateLine", label: "铁路专用线" },
  { key: "shipCount", label: "内河水运船舶" },
];

export const routes: RouteItem[] = [
  { province: "湖北", text: "黑龙江铁、海、江物流多式联运通道", tone: "blue" },
  { province: "湖北", text: "新疆江、铁物流多式联运通道", tone: "green" },
  { province: "湖北", text: "国际公、空物流快线通道", tone: "gold" },
];
