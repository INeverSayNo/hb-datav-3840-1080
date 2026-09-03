import { EnumEntity } from "./enum";

// 托运方式 / 运输方式
export const TransportTypeDefinitions = {
  Railway: {
    id: 0,
    label: "铁路",
  },
  Highway: {
    id: 1,
    label: "公路",
  },
  Waterway: {
    id: 2,
    label: "水运",
  },
  RailwayAndHighway: {
    id: 3,
    label: "公铁联运",
  },
  RailwayAndWaterway: {
    id: 4,
    label: "铁水联运",
  },
  HighwayAndWaterway: {
    id: 5,
    label: "公水联运",
  },
  UnionAll: {
    id: 6,
    label: "铁公水联运",
  },
} as const;

export type TransportTypeId =
  (typeof TransportTypeDefinitions)[keyof typeof TransportTypeDefinitions]["id"];
export type TransportTypeName =
  (typeof TransportTypeDefinitions)[keyof typeof TransportTypeDefinitions]["label"];

class TransportTypeEntity extends EnumEntity {
  Enum = TransportTypeDefinitions;
}

export const TransportTypeEnum = new TransportTypeEntity();

// 服务能力（Servicetype）
export const ServiceTypeDefinitions = {
  Railway: {
    id: 0,
    label: "铁路",
  },
  Highway: {
    id: 1,
    label: "公路",
  },
  Waterway: {
    id: 2,
    label: "水运",
  },
  MultimodalOperator: {
    id: 3,
    label: "多式联运经营人",
  },
} as const;

export type ServiceTypeId =
  (typeof ServiceTypeDefinitions)[keyof typeof ServiceTypeDefinitions]["id"];

export type ServiceTypeName =
  (typeof ServiceTypeDefinitions)[keyof typeof ServiceTypeDefinitions]["label"];

class ServiceTypeEntity extends EnumEntity {
  Enum = ServiceTypeDefinitions;
}

export const ServiceTypeEnum = new ServiceTypeEntity();

// 运载方式（CarriageType）
export const CarriageTypeDefinitions = {
  Bulk: {
    id: 0,
    label: "散货",
  },
  Container: {
    id: 1,
    label: "集装箱",
  },
  BulkToContainer: {
    id: 2,
    label: "散改集",
  },
} as const;

export type CarriageTypeId =
  (typeof CarriageTypeDefinitions)[keyof typeof CarriageTypeDefinitions]["id"];

export type CarriageTypeName =
  (typeof CarriageTypeDefinitions)[keyof typeof CarriageTypeDefinitions]["label"];

class CarriageTypeEntity extends EnumEntity {
  Enum = CarriageTypeDefinitions;
}

export const CarriageTypeEnum = new CarriageTypeEntity();

// 异常状态（ExceptionType）
export const ExceptionTypeDefinitions = {
  Pending: {
    id: 0,
    label: "待处理",
  },
  Followed: {
    id: 1,
    label: "已关注",
  },
  InProgress: {
    id: 2,
    label: "已跟进",
  },
  Closed: {
    id: 3,
    label: "已关闭",
  },
} as const;

export type ExceptionTypeId =
  (typeof ExceptionTypeDefinitions)[keyof typeof ExceptionTypeDefinitions]["id"];

export type ExceptionTypeName =
  (typeof ExceptionTypeDefinitions)[keyof typeof ExceptionTypeDefinitions]["label"];

class ExceptionTypeEntity extends EnumEntity {
  Enum = ExceptionTypeDefinitions;
}

export const ExceptionTypeEnum = new ExceptionTypeEntity();

// 节点类型（LogisiticNodeType，原文档拼写有误，已按规范命名为 LogisticNodeType）
export const LogisticNodeTypeDefinitions = {
  Railway: {
    id: 0,
    label: "铁路",
  },
  Waterway: {
    id: 1,
    label: "水运",
  },
} as const;

export type LogisticNodeTypeId =
  (typeof LogisticNodeTypeDefinitions)[keyof typeof LogisticNodeTypeDefinitions]["id"];

class LogisticNodeTypeEntity extends EnumEntity {
  Enum = LogisticNodeTypeDefinitions;
}

export const LogisticNodeTypeEnum = new LogisticNodeTypeEntity();

// 运力（Capacitytype）
export const CapacityTypeDefinitions = {
  Highway: {
    id: 0,
    label: "公路",
    color: "#20A762",
  },
  Railway: {
    id: 1,
    label: "铁路",
    color: "#00C4C5",
  },
  Waterway: {
    id: 2,
    label: "水运",
    color: "#38B4FF",
  },
  Airway: {
    id: 3,
    label: "空运",
    color: "#FF8A00",
  },
} as const;

export type CapacityTypeId =
  (typeof CapacityTypeDefinitions)[keyof typeof CapacityTypeDefinitions]["id"];

export type CapacityTypeName =
  (typeof CapacityTypeDefinitions)[keyof typeof CapacityTypeDefinitions]["label"];

class CapacityTypeEntity extends EnumEntity {
  Enum = CapacityTypeDefinitions;
}

export const CapacityTypeEnum = new CapacityTypeEntity();
