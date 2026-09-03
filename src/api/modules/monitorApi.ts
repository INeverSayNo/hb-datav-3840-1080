import type { MonitorTable } from "@/types/monitor";
import { baseApi } from "../baseApi";

export function GetMonitorTable() {
  return baseApi.get<MonitorTable>("/api/resource/wh_screen/hb/panel2");
}

export function GetMonitorTableStatics() {
  return baseApi.get<Record<"provider"|"shipper"|"wayBill", number>>("/api/resource/wh_screen/hb/panel2s");
}
