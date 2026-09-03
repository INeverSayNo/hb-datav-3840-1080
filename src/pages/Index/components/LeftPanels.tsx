import styled from "styled-components";
import { BarChart, type BarSeriesOption } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
  type TooltipComponentOption,
} from "echarts/components";
import type { ComposeOption } from "echarts/core";

import Chart from "@/components/chart";
import cyanRing from "@/assets/born-cyan-blue.webp";
import blueRing from "@/assets/horn-blue.webp";
import goldRing from "@/assets/horn-orage.webp";
import freightIcon from "@/assets/intermodal-statistics-volume.webp";
import countIcon from "@/assets/intermodal-statistics-count.webp";
// import tooltipBg from "@/assets/intermodal-statistics-echart-num-bg.webp";
import riseArrow from "@/assets/intermodal-statistics-rise-arrow.webp";
import chartHeaderTitleIcon from "@/assets/intermodal-statistics-title-arrow.webp";
import watewayIntermodalTransportChecked from "@/assets/wateway-intermodal-transport-checked.webp";
import watewayIntermodalTransportUnCheck from "@/assets/wateway-intermodal-transport-uncheck.webp";

import { overviewMetrics, type OverviewMetric } from "../data";
import SectionTitle from "./SectionTitle";
import { memo, useMemo, useState } from "react";
import { useScreenBaseDataStore } from "@/store/useScreenBaseData";
import { formatNumber } from "@/utils/num";
import Modal from "@/components/modal";
import { createPortal } from "react-dom";

const LeftRail = styled.aside`
  position: absolute;
  left: 70px;
  top: 300px;
  width: 1460px;
  height: 1880px;
  z-index: 2;
`;

const Panel = styled.section`
  position: absolute;
  left: 0;
  width: 100%;
`;

const OverviewPanel = styled(Panel)`
  top: 0;
  height: 638px;
`;

const FreightPanel = styled(Panel)`
  top: 568px;
  height: 820px;
`;

const SummaryPanel = styled(Panel)`
  top: 1520px;
  height: 540px;
`;

const OverviewList = styled.div`
  position: absolute;
  left: 80px;
  right: 35px;
  top: 180px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
`;

const OverviewItem = styled.div`
  position: relative;
  height: 260px;
`;

const Ring = styled.img`
  position: absolute;
  left: 0;
  top: 0;
  width: 262px;
  height: 239px;
  object-fit: contain;
`;

const OverviewText = styled.div`
  position: absolute;
  left: 146px;
  top: 10px;
  min-width: 260px;
  color: #fff;
  text-shadow: 0 0 14px rgba(101, 222, 255, 0.35);
`;

const MetricValue = styled.div`
  font-size: 54px;
  line-height: 62px;
  font-weight: 800;
  letter-spacing: 1px;
  white-space: nowrap;
`;

const MetricLabel = styled.div`
  margin-top: 20px;
  color: #c4d5df;
  font-size: 34px;
  line-height: 40px;
  white-space: nowrap;
`;

const SummaryStats = styled.div`
  position: absolute;
  top: 130px;
  left: 76px;
  display: grid;
  grid-template-columns: 570px 570px;
  gap: 88px;
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  height: 180px;
`;

const FreightBadge = styled.img`
  width: 169px;
  height: 195px;
  object-fit: contain;
  margin-right: 38px;
`;

const StatContent = styled.div`
  color: #d8e5ec;
`;

const StatLabel = styled.div`
  margin-bottom: 8px;
  font-size: 36px;
  letter-spacing: 2px;
`;

const StatValue = styled.strong`
  color: #fff;
  font-size: 53px;
  line-height: 64px;
  letter-spacing: 3px;
  text-shadow: 0 0 15px rgba(113, 218, 255, 0.38);
`;

const Unit = styled.span`
  margin-left: 10px;
  color: #c5d7df;
  font-size: 30px;
`;

const RisingWrap = styled.div`
  display: flex;
  align-items: center;
`;

const Rising = styled.img`
  // display: inline-block;
  width: 33px;
  height: 46px;
  margin-right: 14px;
  // margin: 0 14px 5px 0;
  // border-left: 13px solid transparent;
  // border-right: 13px solid transparent;
  // border-bottom: 24px solid #29fff3;
  // filter: drop-shadow(0 0 8px #29fff3);
`;

const ChartHeader = styled.div`
  position: absolute;
  left: 72px;
  right: 90px;
  top: 370px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #a9c0cb;
  font-size: 30px;
  letter-spacing: 2px;
`;

const ChartHeaderTitleWrap = styled.div`
  display: flex;
  align-items: center;
`;
const ChartHeaderTitleIcon = styled.img`
  width: 22px;
  height: 22px;
`;
const ChartHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  font-size: 38px;
  margin-left: 20px;
`;

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  color: #c7dce5;
  font-size: 34px;
  &::before {
    content: "";
    width: 21px;
    height: 21px;
    border-radius: 50%;
    background: #16e8ed;
    box-shadow: 0 0 12px #16e8ed;
  }
`;

const ChartBox = styled.div`
  position: absolute;
  left: 16px;
  right: 86px;
  top: 460px;
  height: 400px;
`;

const Tabs = styled.div`
  position: absolute;
  left: 88px;
  top: 112px;
  display: flex;
  gap: 84px;
`;

const Tab = styled.button<{ $active?: boolean }>`
  position: relative;
  width: 232px;
  height: 60px;
  border: none;
  background: transparent;
  color: ${({ $active }) => ($active ? "#d8fff2" : "#90aeb4")};
  font-size: 36px;
  letter-spacing: 3px;
  box-shadow: ${({ $active }) =>
    $active
      ? "inset 0 0 18px rgba(0,255,157,.24), 0 0 10px rgba(0,255,157,.18)"
      : "none"};
  cursor: pointer;
  font-size: 36px;
`;

const TabItemText = styled.span`
  color: #fcfdff;
  text-shadow:
    0 0 30px #ffffff,
    0 0 40px #ffffff;
`;

const OverviewTabImg = styled.img`
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  width: 100%;
  z-index: -1;
`;

const YearGrid = styled.div`
  position: absolute;
  left: 126px;
  right: 78px;
  top: 210px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 98px;
`;

const YearCard = styled.div`
  text-align: center;
  color: #e5f0f4;
`;

const Year = styled.div`
  margin-bottom: 18px;
  font-size: 42px;
  font-weight: 700;
`;

const YearValue = styled.div`
  height: 74px;
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(53, 151, 190, 0.75);
  background: rgba(4, 28, 39, 0.45);
  color: #fff;
  font-size: 40px;
  font-weight: 700;
  box-shadow: inset 0 0 12px rgba(47, 181, 233, 0.07);

  small {
    margin-left: 5px;
    font-size: 30px;
    font-weight: 400;
  }
`;

const FullscreenLoadingOverlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(4, 20, 30, 0.5);
  backdrop-filter: blur(3px);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
  transition: opacity 240ms ease;
`;
const LoadingSpinner = styled.div`
  width: 36px;
  height: 36px;
  border: 2px solid rgba(32, 219, 219, 0.18);
  border-top-color: #20dbdb;
  border-radius: 50%;
  animation: map-spin 0.9s linear infinite;
  box-shadow: 0 0 28px rgba(32, 219, 219, 0.35);

  @keyframes map-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.div`
  color: rgba(232, 250, 255, 0.92);
  font-size: 12px;
  letter-spacing: 6px;
  text-shadow: 0 0 4px rgba(32, 219, 219, 0.65);
`;

type FreightChartOption = ComposeOption<
  BarSeriesOption | GridComponentOption | TooltipComponentOption
>;

const ringByTone: Record<OverviewMetric["tone"], string> = {
  cyan: cyanRing,
  blue: blueRing,
  gold: goldRing,
};

const FreightChart = memo(function FreightChart({
  items,
}: {
  items: Array<{ month: string; teu: number }>;
}) {
  return (
    <Chart<FreightChartOption>
      use={[BarChart, GridComponent, TooltipComponent]}
      option={{
        animationDuration: 900,
        grid: { left: 68, right: 20, top: 20, bottom: 46 },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "line", lineStyle: { color: "#21e7eb" } },
          backgroundColor: "rgba(3, 31, 42, .94)",
          borderColor: "#21e7eb",
          textStyle: { color: "#fff", fontSize: 28 },
        },
        xAxis: {
          type: "category",
          data: items.map((item) => item.month + "月"),
          axisTick: { show: false },
          axisLine: {
            lineStyle: { color: "rgba(82, 146, 164, .28)", width: 2 },
          },
          axisLabel: { color: "#5e7c86", fontSize: 30, margin: 22 },
        },
        yAxis: {
          type: "value",
          min: 0,
          max: 400000,
          interval: 100000,
          axisTick: { show: true },
          axisLine: { show: true },
          axisLabel: { color: "#5e7c86", fontSize: 30, margin: 20 },
          splitLine: {
            lineStyle: { color: "rgba(42, 111, 125, .18)", width: 2 },
          },
        },
        series: [
          {
            type: "bar",
            barWidth: 18,
            data: items.map((value) => value.teu),
            itemStyle: {
              borderRadius: [10, 10, 0, 0],
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "#2cffff" },
                  { offset: 0.35, color: "#08cfd6" },
                  { offset: 1, color: "rgba(0, 96, 113, 0)" },
                ],
              },
              shadowBlur: 18,
              shadowColor: "rgba(20, 255, 245, .7)",
            },
          },
        ],
      }}
    />
  );
});

export default function LeftPanels() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [{ label: "水铁联运" }, { label: "水水中转" }];

  const [serviceHallModalOpen, setServiceHallModalOpen] = useState(false);

  const [isLoading, setLoading] = useState(false);

  const [serviceHallIframeUrl, _setServiceHallIframeUrl] = useState(
    "https://www.whisc.cn/#/transactionService/serviceHall",
  );

  const onLoadIframe = () => {
    setLoading(false);
  };

  const leftTopPanel = useScreenBaseDataStore((s) => s.leftTopPanel);
  const leftMiddlePanel = useScreenBaseDataStore((s) => s.leftMiddlePanel);
  const leftBottomPanel = useScreenBaseDataStore((s) => s.leftBottomPanel);

  const freightData = useMemo(
    () =>
      leftMiddlePanel.items.map((item) => ({
        month: item.month,
        teu: item.teu,
      })),
    [leftMiddlePanel.items],
  );

  const metrics = useMemo(
    () =>
      overviewMetrics.map((metric) => ({
        ...metric,
        value: formatNumber(leftTopPanel[metric.key]),
      })),
    [leftTopPanel],
  );

  const yearSummaries = useMemo(() => {
    if (!leftBottomPanel.length) return [];
    const [waterwayRawaily, twoWaterway] = leftBottomPanel;
    if (activeTab === 0) {
      return waterwayRawaily.items;
    }
    return twoWaterway.items;
  }, [leftBottomPanel, activeTab]);

  const toServiceHall = (label: string) => {
    if (label !== "多式联运重点线路") return;
    setServiceHallModalOpen(true);
    setLoading(true);
  };

  return (
    <LeftRail aria-label="左侧数据面板">
      <OverviewPanel>
        <SectionTitle>全省多式联运整体数据概览</SectionTitle>
        <OverviewList>
          {metrics.map((metric) => (
            <OverviewItem
              key={metric.label}
              style={{
                cursor:
                  metric.label === "多式联运重点线路" ? "pointer" : "default",
              }}
              onClick={() => toServiceHall(metric.label)}
            >
              <Ring src={ringByTone[metric.tone]} alt="" />
              <OverviewText>
                <MetricValue>
                  {metric.value} <small>{metric.unit}</small>
                </MetricValue>
                <MetricLabel>{metric.label}</MetricLabel>
              </OverviewText>
            </OverviewItem>
          ))}
        </OverviewList>
      </OverviewPanel>

      <FreightPanel>
        <SectionTitle>全省水铁联运货运量</SectionTitle>
        <SummaryStats>
          <StatCard>
            <FreightBadge src={freightIcon} alt="" />
            <StatContent>
              <StatLabel>当期水铁货运量</StatLabel>
              <StatValue>{formatNumber(leftMiddlePanel.summary.sum)}</StatValue>
              <Unit>万TEU</Unit>
            </StatContent>
          </StatCard>
          <StatCard>
            {/* <TrendBadge aria-hidden="true" /> */}
            <FreightBadge src={countIcon} alt="" />
            <StatContent>
              <StatLabel>当期同比</StatLabel>
              <RisingWrap>
                <Rising src={riseArrow} />
                <StatValue>{leftMiddlePanel.summary.yoyRate * 100}%</StatValue>
              </RisingWrap>
            </StatContent>
          </StatCard>
        </SummaryStats>
        <ChartHeader>
          <ChartHeaderTitleWrap>
            <ChartHeaderTitleIcon src={chartHeaderTitleIcon} />
            <ChartHeaderTitle>数据统计（单位：万TEU）</ChartHeaderTitle>
          </ChartHeaderTitleWrap>
          <Legend>货运量</Legend>
        </ChartHeader>
        <ChartBox>
          <FreightChart items={freightData} />
        </ChartBox>
      </FreightPanel>

      <SummaryPanel>
        <SectionTitle>武汉多式联运数据整体概况</SectionTitle>
        <Tabs>
          {tabs.map((tab, index) => (
            <Tab
              key={tab.label}
              type="button"
              $active={activeTab === index}
              onClick={() => setActiveTab(index)}
            >
              <OverviewTabImg
                src={
                  activeTab === index
                    ? watewayIntermodalTransportChecked
                    : watewayIntermodalTransportUnCheck
                }
              />
              <TabItemText>{tab.label}</TabItemText>
            </Tab>
          ))}
        </Tabs>
        <YearGrid>
          {yearSummaries.map((summary) => (
            <YearCard key={summary.year}>
              <Year>{summary.year}</Year>
              <YearValue>
                {summary.teu}
                <small>万TEU</small>
              </YearValue>
              <YearValue>
                {summary.price}
                <small>万元</small>
              </YearValue>
            </YearCard>
          ))}
        </YearGrid>
      </SummaryPanel>

      {serviceHallModalOpen && (
        <Modal
          open
          onClose={() => setServiceHallModalOpen(false)}
          width="68vw"
          height="80vh"
          title="物流服务"
        >
          <iframe
            src={serviceHallIframeUrl}
            title="物流服务"
            style={{ width: "100%", height: "100%", border: 0 }}
            onLoad={onLoadIframe}
          />
        </Modal>
      )}

      {createPortal(
        <FullscreenLoadingOverlay $visible={isLoading}>
          <LoadingSpinner />
          <LoadingText>功能启动中</LoadingText>
        </FullscreenLoadingOverlay>,
        document.body,
      )}
    </LeftRail>
  );
}
