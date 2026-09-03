import AutoFit from "@/components/autoFit";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  TALL_SCREEN_MIN_WIDTH,
} from "@/constants/screen";
import NumberAnimation from "@/components/numberAnimation";
import monitorArrow from "@/assets/monitor-arrow.webp";
import monitorOrderIcon from "@/assets/monitor-order-count.webp";
import monitorShipperIcon from "@/assets/monitor-consignment-count.webp";
import monitorProviderIcon from "@/assets/monitor-service-count.webp";
// import monitorWarningIcon from "@/assets/monitor-warnning.webp";
import { useMonitorData } from "@/store/useMonitorData";
import type {
  // MonitorExceptionWarning,
  MonitorNodeFlow,
  MonitorProvider,
  MonitorRequestEvent,
  MonitorShipper,
  MonitorStopLimitLoading,
  MonitorTransportCapacity,
  MonitorWaybill,
} from "@/types/monitor";
import { useNavigate } from "react-router";
import styled from "styled-components";
import DashboardHeader from "../Index/components/DashboardHeader";
import LoopingTable, { type LoopingTableColumn } from "./LoopingTable";
import { useMonitorStream } from "./useMonitorStream";

import capacityHighwayIcon from "@/assets/capacity-highway.webp";
import capacityRailwayIcon from "@/assets/capacity-railway.webp";
import capacityAirwayIcon from "@/assets/capacity-airway.webp";
import capacityWaterwayIcon from "@/assets/capacity-waterway.webp";
import ArrowIconImg from "@/assets/arrow.png";
import { CapacityTypeEnum } from "@/utils/monitorEnum";
import { useMemo, useState } from "react";

import ToggleActiveBg from "@/assets/toggle-active.webp";
import ToggleUnActiveBg from "@/assets/toggle-unactive.webp";

const Dashboard = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: #fff;
  font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif;
  background:
    radial-gradient(circle at 50% 10%, rgba(7, 78, 91, 0.2), transparent 34%),
    #061821;
  user-select: none;
`;

const Content = styled.main`
  position: absolute;
  z-index: 2;
  top: 310px;
  bottom: 220px;
  left: 25px;
  right: 25px;
  display: grid;
  grid-template-columns: minmax(0, 1670fr) minmax(0, 2120fr) minmax(0, 1670fr);
  gap: 45px;
`;

const Column = styled.section`
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const SummaryGrid = styled.div`
  height: 240px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 45px;
`;

const SummaryCard = styled.article<{ $accent: string }>`
  display: flex;
  align-items: center;
  min-width: 0;
  height: 240px;
  padding: 20px 28px;
  border: 3px solid ${({ $accent }) => $accent};
  background: ${({ $accent }) => `${$accent}18`};
  box-shadow: inset 0 0 50px rgba(2, 39, 51, 0.54);
`;

const SummaryIcon = styled.img`
  width: 150px;
  height: 174px;
  flex: 0 0 auto;
  object-fit: contain;
`;

const SummaryText = styled.div`
  min-width: 0;
  margin-left: 25px;
`;

const SummaryValue = styled(NumberAnimation)`
  color: #f3fbff;
  font-size: 52px;
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: 1px;
  text-shadow: 0 0 18px rgba(104, 222, 255, 0.34);
`;

const SummaryLabel = styled.div`
  margin-top: 10px;
  color: #d3e6ee;
  font-size: 34px;
  font-weight: 700;
  white-space: nowrap;
`;

const Panel = styled.section<{ $height: number | string; $marginTop?: number }>`
  height: ${({ $height }) =>
    typeof $height === "number" ? $height + "px" : $height};
  margin-top: ${({ $marginTop = 0 }) => $marginTop}px;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const PanelHeading = styled.div`
  height: 76px;
  flex: 0 0 76px;
  display: flex;
  align-items: center;
  min-width: 0;
`;

const HeadingArrow = styled.img`
  width: 34px;
  height: 28px;
  margin-right: 16px;
  object-fit: contain;
`;

const HeadingText = styled.h2`
  margin: 0;
  color: #e7f4f8;
  font-size: 45px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 2px;
  white-space: nowrap;
`;

const LiveLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 13px;
  margin-left: 26px;
  color: #2ddc82;
  font-size: 39px;
  font-weight: 600;
  white-space: nowrap;
`;

const LiveDot = styled.span`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #31d372;
  border: 7px solid rgba(22, 118, 73, 0.82);
  box-shadow: 0 0 18px rgba(54, 255, 132, 0.72);
  animation: breathe 1.8s ease-in-out infinite;
  transform-origin: center;
  margin-right: 10px;

  @keyframes breathe {
    0% {
      transform: scale(0.96);
      box-shadow:
        0 0 10px rgba(54, 255, 132, 0.5),
        0 0 18px rgba(54, 255, 132, 0.72);
      opacity: 0.9;
    }
    50% {
      transform: scale(1.12);
      box-shadow:
        0 0 16px rgba(54, 255, 132, 0.75),
        0 0 28px rgba(54, 255, 132, 0.9),
        0 0 42px rgba(54, 255, 132, 0.5);
      opacity: 1;
    }
    100% {
      transform: scale(0.96);
      box-shadow:
        0 0 10px rgba(54, 255, 132, 0.5),
        0 0 18px rgba(54, 255, 132, 0.72);
      opacity: 0.9;
    }
  }
`;

const TableBody = styled.div`
  min-height: 0;
  flex: 1;
`;

const EventTime = styled.time`
  flex: 0 0 170px;
  color: #9bb1bb;
`;

const EventRoute = styled.span`
  flex: 1 1 260px;
  min-width: 0;
  overflow: hidden;
  color: #28cf77;
  text-overflow: ellipsis;
`;

const EventGoods = styled.span`
  flex: 0 1 250px;
  min-width: 0;
  overflow: hidden;
  color: #e8f1f4;
  text-overflow: ellipsis;
  margin: 0 10px;
`;

const EventPrice = styled.span`
  flex: 0 0 auto;
  color: #ff9c14;
  font-weight: 700;
  margin-right: 10px;
`;

const EventTransit = styled.span`
  flex: 0 0 auto;
  color: #e2ecef;
`;

const WarningType = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 18px;
  color: #b64d77;
`;

// const WarningIcon = styled.img`
//   width: 43px;
//   height: 38px;
//   object-fit: contain;
// `;

// const StatusBadge = styled.span<{ $status: string }>`
//   display: inline-block;
//   min-width: 112px;
//   padding: 9px 18px;
//   border-radius: 5px;
//   color: #ffe8ef;
//   background: ${({ $status }) =>
//     $status === "已关闭" ? "#485769" : "rgba(128, 24, 67, 0.9)"};
//   font-size: 31px;
//   line-height: 1.1;
//   text-align: center;
// `;

const StopLimitRason = styled.div``;

const Footer = styled.footer`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 76px;
  color: rgba(40, 105, 130, 0.6);
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 2px;
`;

const CapacityTitle = styled.div`
  display: flex;
  align-items: center;
  span {
    margin-left: 20px;
  }
`;

const CapacityImg = styled.img`
  width: 54px;
  height: 54px;
`;

const ArrowIcon = styled.img`
  width: 54px;
  height: 34px;
`;

const SectionTitleWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TransportToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0 30px;
  margin-bottom: 8px;
`;

const TransportToggleBtn = styled.div<{ $isActive: boolean }>`
  font-size: 40px;
  position: relative;
  width: 224px;
  height: 75px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TransportToggleBg = styled.img`
  position: absolute;
  width: 100%;
  height: 100%;
`;

function SectionTitle({
  children,
  live,
}: {
  children: string;
  live?: "scroll" | "live";
  legend?: boolean;
  show?: boolean;
}) {
  return (
    <PanelHeading>
      <HeadingArrow src={monitorArrow} alt="" />
      <HeadingText>{children}</HeadingText>
      {live && (
        <LiveLabel>
          {live === "live" && <LiveDot />}
          {live === "live" ? "LIVE" : "实时滚动"}
        </LiveLabel>
      )}
    </PanelHeading>
  );
}

function formatMoney(value: number) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "--";
  if (Math.abs(amount) >= 1000) {
    const compact = amount / 1000;
    return `¥${compact.toFixed(compact % 1 === 0 ? 0 : 1)}K`;
  }
  return `¥${amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

function formatUnitPrice(value: number, unit: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `¥${amount.toFixed(2)}${unit}` : "--";
}

const shipperColumns: LoopingTableColumn<MonitorShipper>[] = [
  { title: "名称", dataIndex: "name", width: 1.8 },
  { title: "联系人", dataIndex: "contact", width: 0.6 },
  { title: "联系电话", dataIndex: "phone", width: 1.15 },
  { title: "托运方式", dataIndex: "method", width: 0.8 },
];

const providerColumns: LoopingTableColumn<MonitorProvider>[] = [
  { title: "名称", dataIndex: "name", width: 1.8 },
  { title: "联系人", dataIndex: "contact", width: 0.6 },
  { title: "联系电话", dataIndex: "phone", width: 1.15 },
  { title: "服务能力", dataIndex: "type", width: 0.8 },
];

const waybillColumns: LoopingTableColumn<MonitorWaybill>[] = [
  {
    title: "运单号",
    dataIndex: "waybillNo",
    width: 0.5,
    render: (item) => <span>{`**` + (item.waybillNo || "").slice(-4)}</span>,
  },
  { title: "客户", dataIndex: "shipperName", width: 1.4 },
  {
    title: "起讫点",
    render: (item) => `${item.origin}→${item.dest}`,
    width: 1.2,
  },
  { title: "品名", dataIndex: "goodsName", width: 0.65 },
  { title: "运载方式", dataIndex: "carriageMethod", width: 0.7 },
  { title: "运输方式", dataIndex: "transportType", width: 0.9 },
  { title: "运价", render: (item) => formatMoney(item.price), width: 0.42 },
];

const nodeColumns: LoopingTableColumn<MonitorNodeFlow>[] = [
  { title: "节点名称", dataIndex: "terminal", width: 1.05 },
  { title: "节点归属", dataIndex: "facility", width: 0.95 },
  {
    title: "货物吞吐量",
    dataIndex: "remark",
    width: 1,
    render: (item) => `${item.remark ? item.remark + "万吨/年" : "--"}`,
  },
  {
    title: "集装箱吞吐量",
    dataIndex: "remark1",
    width: 1.1,
    render: (item) => `${item.remark1 ? item.remark1 + "万TEU/年" : "--"}`,
  },
  { title: "地址", dataIndex: "address", width: 1.35 },
  { title: "运营单位", dataIndex: "providerName", width: 1.3 },
];

const getTransitTime = (start: string | number, end: string | number) => {
  const min = Number(start).toFixed(0);
  const max = Number(end).toFixed(0);
  if (min === max) return max;
  return `${min} - ${max}`;
};

const requestColumns: LoopingTableColumn<MonitorRequestEvent>[] = [
  {
    width: 0.2,
    render: (item) => <EventTime>{item.eventTime}</EventTime>,
  },
  {
    render: (item) => (
      <>
        <EventRoute>{`${item.origin}至${item.dest}`}</EventRoute>
        <EventGoods>{item.goodsName}</EventGoods>
        <EventPrice>{formatUnitPrice(item.price, item.unit)}</EventPrice>

        <EventTransit>{`预估时效：${getTransitTime(item.transitBegin, item.transitEnd)}天`}</EventTransit>
      </>
    ),
  },
];

const getCapatityIcon = (payload: number) => {
  switch (payload) {
    case CapacityTypeEnum.Enum.Airway.id:
      return capacityAirwayIcon;
    case CapacityTypeEnum.Enum.Waterway.id:
      return capacityWaterwayIcon;
    case CapacityTypeEnum.Enum.Railway.id:
      return capacityRailwayIcon;
    case CapacityTypeEnum.Enum.Highway.id:
    default:
      return capacityHighwayIcon;
  }
};

const capacityColumns: LoopingTableColumn<MonitorTransportCapacity>[] = [
  {
    dataIndex: "type",
    width: 0.7,
    render: (item) => (
      <CapacityTitle>
        <CapacityImg src={getCapatityIcon(item.type)} />
        <span style={{ color: CapacityTypeEnum.getSelf(item.type)?.color }}>
          {CapacityTypeEnum.getSelf(item.type)?.label}
        </span>
      </CapacityTitle>
    ),
  },
  { dataIndex: "f1", width: 1.1 },
  {
    dataIndex: "f1",
    width: 0.5,
    render: (item) => {
      return (
        [
          CapacityTypeEnum.Enum.Railway.id,
          CapacityTypeEnum.Enum.Airway.id,
        ].some((id) => id === item.type) && <ArrowIcon src={ArrowIconImg} />
      );
    },
  },
  {
    dataIndex: "f2",
    width: 1.1,
    render: (item) => {
      return [CapacityTypeEnum.Enum.Highway.id].some((id) => id === item.type)
        ? `${item.f2}T`
        : item.f2;
    },
  },
  {
    dataIndex: "f3",
    width: 0.8,
    render: (item) => {
      return [CapacityTypeEnum.Enum.Highway.id].some((id) => id === item.type)
        ? `${item.f3}M`
        : [CapacityTypeEnum.Enum.Waterway.id].some((id) => id === item.type)
          ? `${item.f3}T`
          : item.f3;
    },
  },
  { dataIndex: "f4", width: 0.7 },
];


const stopLimitColumns: LoopingTableColumn<MonitorStopLimitLoading>[] = [
  {
    title: "站点",
    width: 0.7,
    render: (item) => <WarningType>{item.station}</WarningType>,
  },
  { title: "受限发站", dataIndex: "restrictedDepartureStation", width: 0.72 },
  { title: "开始时间", dataIndex: "stopStartDate", width: 1 },
  { title: "结束时间", dataIndex: "stopEndDate", width: 1 },
  {
    title: "原因",
    width: 1.8,
    align: "center",
    render: (item) => <StopLimitRason>{item.stopReason}</StopLimitRason>,
  },
];

function MonitorDashboard() {
  const navigate = useNavigate();
  const summary = useMonitorData((state) => state.summary);
  const shipperList = useMonitorData((state) => state.shipperList);
  const providerList = useMonitorData((state) => state.providerList);
  const waybillList = useMonitorData((state) => state.waybillList);
  const nodeFlowList = useMonitorData((state) => state.nodeFlowList);
  const requestEventList = useMonitorData((state) => state.requestEventList);
  const transportCapacityList = useMonitorData(
    (state) => state.transportCapacityList,
  );

  const [toggleTypeList, setToggleType] = useState([
    {
      label: "水运",
      value: CapacityTypeEnum.Enum.Waterway.id,
      isActive: true,
    },
    {
      label: "铁路",
      value: CapacityTypeEnum.Enum.Railway.id,
      isActive: true,
    },
    {
      label: "公路",
      value: CapacityTypeEnum.Enum.Highway.id,
      isActive: true,
    },
    {
      label: "航空",
      value: CapacityTypeEnum.Enum.Airway.id,
      isActive: true,
    },
  ]);

  const filterTransportCapacityList = useMemo(() => {
    const activeIds = toggleTypeList
      .filter((e) => e.isActive)
      .map((e) => e.value);
    return transportCapacityList.filter((e) =>
      activeIds.some((id) => id === e.type),
    );
  }, [transportCapacityList, toggleTypeList]);

  const changeActiveType = (payload: any) => {
    setToggleType((prev) =>
      prev.map((item) =>
        item.value === payload.value
          ? { ...item, isActive: !item.isActive }
          : item,
      ),
    );
  };
  // const exceptionWarningList = useMonitorData(
  //   (state) => state.exceptionWarningList,
  // );

  const stopLimitLoadingList = useMonitorData(
    (state) => state.stopLimitLoadingList,
  );

  useMonitorStream();

  return (
    <Dashboard>
      <DashboardHeader
        type="monitor"
        title="物流多式联运数据监控中心"
        onBack={() => navigate("/")}
      />
      <Content>
        <Column>
          <SummaryGrid>
            <SummaryCard $accent="#036270">
              <SummaryIcon src={monitorOrderIcon} alt="" />
              <SummaryText>
                <SummaryValue value={summary.wayBill} duration={0.5} />
                <SummaryLabel>运单数量</SummaryLabel>
              </SummaryText>
            </SummaryCard>
            <SummaryCard $accent="#075084">
              <SummaryIcon src={monitorShipperIcon} alt="" />
              <SummaryText>
                <SummaryValue value={summary.shipper} duration={0.5} />
                <SummaryLabel>托运人</SummaryLabel>
              </SummaryText>
            </SummaryCard>
            <SummaryCard $accent="#036270">
              <SummaryIcon src={monitorProviderIcon} alt="" />
              <SummaryText>
                <SummaryValue value={summary.provider} duration={0.5} />
                <SummaryLabel>服务商</SummaryLabel>
              </SummaryText>
            </SummaryCard>
          </SummaryGrid>

          <Panel $height={700} $marginTop={0}>
            <SectionTitle>物流托运人</SectionTitle>
            <TableBody>
              <LoopingTable
                data={shipperList}
                columns={shipperColumns}
                visibleRows={8}
                rowHeight={108}
                startDelay={1200}
              />
            </TableBody>
          </Panel>

          <Panel $height={670} $marginTop={0}>
            <SectionTitle>物流多式联运服务商</SectionTitle>
            <TableBody>
              <LoopingTable
                data={providerList}
                columns={providerColumns}
                visibleRows={6}
                rowHeight={98}
                startDelay={1800}
              />
            </TableBody>
          </Panel>

          <Panel $height={475} $marginTop={0}>
            <SectionTitle>异常预警</SectionTitle>
            <TableBody>
              <LoopingTable
                data={stopLimitLoadingList}
                columns={stopLimitColumns}
                visibleRows={2}
                rowHeight={120}
                borderColor="rgba(117, 28, 65, 0.96)"
                headerBackground="rgba(112, 28, 62, 0.94)"
              />
            </TableBody>
          </Panel>
        </Column>

        <Column>
          <Panel $height={"50.5%"}>
            <SectionTitle live="scroll">多式联运整体数据概览</SectionTitle>
            <TableBody>
              <LoopingTable
                data={waybillList}
                columns={waybillColumns}
                visibleRows={11}
                rowHeight={107}
                scrollDirection="down"
              />
            </TableBody>
          </Panel>

          <Panel $height={"46.5%"} $marginTop={0}>
            <SectionTitle>重要物流节点</SectionTitle>
            <TableBody>
              <LoopingTable
                data={nodeFlowList}
                columns={nodeColumns}
                visibleRows={11}
                rowHeight={105}
                startDelay={2400}
              />
            </TableBody>
          </Panel>
        </Column>

        <Column>
          <Panel $height={"40%"}>
            <SectionTitle live="live">实时需求事件流</SectionTitle>
            <TableBody>
              <LoopingTable
                data={requestEventList}
                columns={requestColumns}
                visibleRows={9}
                rowHeight={110}
                showHeader={false}
                rowPadding="0 34px"
                scrollDirection="down"
                startDelay={600}
              />
            </TableBody>
          </Panel>

          <Panel $height={"58%"} $marginTop={0}>
            <SectionTitleWrap>
              <SectionTitle>实时运力 (水-铁-公-空)</SectionTitle>
              <TransportToggle>
                {toggleTypeList.map((e) => (
                  <TransportToggleBtn
                    key={e.value}
                    $isActive={e.isActive}
                    onClick={() => changeActiveType(e)}
                  >
                    <TransportToggleBg
                      src={e.isActive ? ToggleActiveBg : ToggleUnActiveBg}
                    ></TransportToggleBg>
                    <span>{e.label}</span>
                  </TransportToggleBtn>
                ))}
              </TransportToggle>
            </SectionTitleWrap>
            <TableBody>
              <LoopingTable
                data={filterTransportCapacityList}
                columns={capacityColumns}
                visibleRows={14}
                rowHeight={112}
                showHeader={false}
              />
            </TableBody>
          </Panel>
        </Column>
      </Content>
      <Footer>武汉市多式联运服务中心&nbsp;&nbsp;数据经脱敏处理</Footer>
    </Dashboard>
  );
}

export default function Index() {
  return (
    <AutoFit
      dw={DESIGN_WIDTH}
      dh={DESIGN_HEIGHT}
      mode="expand"
      expandHeightMinWidth={TALL_SCREEN_MIN_WIDTH}
      aria-label="武汉多式联运服务中心数据大屏"
    >
      <MonitorDashboard />
    </AutoFit>
  );
}
