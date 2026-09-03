import type {
  ExceptionTypeName,
  LogisticNodeTypeId,
  TransportTypeName,
  CarriageTypeName,
  ServiceTypeName,
} from "@/utils/monitorEnum";

export interface MonitorSummary {
  wayBill: number;
  shipper: number;
  provider: number;
}

export interface MonitorShipper {
  id: string;
  name: string;
  contact: string;
  phone: string;
  method: string;
}

export interface MonitorProvider {
  id: string;
  name: string;
  contact: string;
  phone: string;
  type: ServiceTypeName;
}

export interface MonitorWaybill {
  id: string;
  waybillNo: string;
  shipperName: string;
  origin: string;
  dest: string;
  goodsName: string;
  carriageMethod: CarriageTypeName;
  transportType: TransportTypeName;
  price: number;
}

export interface MonitorNodeFlow {
  id: string;
  nodeType: LogisticNodeTypeId;
  terminal: string;
  facility: string;
  address: string;
  providerName: string;
  remark: string;
  remark1: string
}

export interface MonitorRequestEvent {
  id: string;
  eventTime: string;
  origin: string;
  dest: string;
  goodsName: string;
  price: number;
  unit: string;
  transitBegin: number;
  transitEnd: number;
}

export interface MonitorTransportCapacity {
  type: number;
  f1: string;
  f2: string;
  f3: string;
  f4: string;
  id: string
}

export interface MonitorExceptionWarning {
  id: string;
  exceptionType: string;
  exceptionMsg: string;
  exceptionTime: string;
  exceptionStatus: ExceptionTypeName;
}

export interface MonitorStopLimitLoading {
  id: string;
  stopReason: string;
  restrictedDepartureStation: string;
  stopEndDate: string;
  stopStartDate: string;
  station: string
}

/** 武汉第二屏（物流大屏）首屏数据。 */
export interface MonitorTable {
  summary: MonitorSummary;
  shipperList: MonitorShipper[];
  providerList: MonitorProvider[];
  waybillList: MonitorWaybill[];
  nodeFlowList: MonitorNodeFlow[];
  requestEventList: MonitorRequestEvent[];
  transportCapacityList: MonitorTransportCapacity[];
  exceptionWarningList: MonitorExceptionWarning[];
  stopLimitLoadingList: MonitorStopLimitLoading[]
}

export interface MonitorDataTypeMap {
  "wh-shipper": MonitorShipper;
  "wh-provider": MonitorProvider;
  "wh-waybill": MonitorWaybill;
  "wh-nodeflow": MonitorNodeFlow;
  "wh-request-event": MonitorRequestEvent;
  "wh-transport-capacity": MonitorTransportCapacity;
  "wh-exception-warning": MonitorExceptionWarning;
  "wh-stop-limit-loading": MonitorStopLimitLoading;
  "wh-secscreen-summary": MonitorSummary
}

export type MonitorDataType = keyof MonitorDataTypeMap;
export type MonitorEventOperation = "created" | "updated" | "deleted";

export type MonitorSseEvent = {
  [K in MonitorDataType]: {
    eventId: string;
    eventType: `${K}:${MonitorEventOperation}`;
    dataType: K;
    data: MonitorDataTypeMap[K];
  };
}[MonitorDataType];
