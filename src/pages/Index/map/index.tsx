import { useEffect, useMemo } from "react";
import * as echarts from "echarts/core";
import { GeoComponent } from "echarts/components";
import styled from "styled-components";

import Chart from "@/components/chart";
import hubeiMapData from "@/assets/hb.json";
import hubeiOutlineData from "@/assets/hb_outline.json";
import hubeiDem from "@/assets/hb_dem.webp";

const HUBEI_MAP_NAME = "hubei-city-map";
const HUBEI_OUTLINE_NAME = "hubei-province-outline";
const MAP_LAYOUT_SIZE = "132%";
const MAP_ASPECT_SCALE = 0.89;
const MAP_CENTER_X = "50%";
const MAP_CENTER_Y = 49;
const MAP_BACKGROUND_COLOR = "#22ddf957";
const MAP_GLOW_COLOR = "#20dbdb";

echarts.use([GeoComponent]);
echarts.registerMap(
  HUBEI_MAP_NAME,
  hubeiMapData as unknown as Parameters<typeof echarts.registerMap>[1]
);
echarts.registerMap(
  HUBEI_OUTLINE_NAME,
  hubeiOutlineData as unknown as Parameters<typeof echarts.registerMap>[1]
);

const MapRoot = styled.section`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
  isolation: isolate;
`;

const DemLayer = styled.img`
  position: absolute;
  left: 50%;
  top: 7.2%;
  z-index: 2;
  width: auto;
  height: 70.3%;
  opacity: 0.28;
  object-fit: contain;
  pointer-events: none;
  transform: translateX(-50%);
  mix-blend-mode: screen;
  filter: sepia(1) saturate(4) hue-rotate(130deg) brightness(0.76)
    contrast(1.18);
`;

const stackColors = [
  "rgba(40, 158, 192, 0.08)",
  "rgba(40, 158, 192, 0.12)",
  "rgba(40, 158, 192, 0.16)",
];

function createStackLayer(index: number): echarts.EChartsCoreOption {
  return {
    map: HUBEI_OUTLINE_NAME,
    roam: false,
    silent: true,
    layoutCenter: [MAP_CENTER_X, `${MAP_CENTER_Y + (index + 1) * 1.2}%`],
    layoutSize: MAP_LAYOUT_SIZE,
    aspectScale: MAP_ASPECT_SCALE,
    z: index,
    label: { show: false },
    itemStyle: {
      areaColor: stackColors[index],
      borderColor: `rgba(32, 219, 219, ${0.12 + index * 0.06})`,
      borderWidth: 2.2,
      shadowBlur: 18 + index * 7,
      shadowColor: "rgba(32, 219, 219, 0.28)",
      shadowOffsetY: 16,
    },
    emphasis: { disabled: true },
    select: { disabled: true },
  };
}

export type HubeiMapProps = {
  onReady?: () => void;
  /** 与 three.js 版本保持一致的接口；ECharts 版本无渲染循环，忽略该参数。 */
  paused?: boolean;
};

export default function HubeiMap({ onReady }: HubeiMapProps) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  const [stackOption, mainOption] = useMemo<
    [echarts.EChartsCoreOption, echarts.EChartsCoreOption]
  >(() => {
    const sharedOption = {
      animation: true,
      animationDuration: 700,
      animationEasing: "cubicOut",
      backgroundColor: "transparent",
    } as const;

    return [
      {
        ...sharedOption,
        geo: [
          createStackLayer(0),
          // createStackLayer(1),
          // createStackLayer(2),
        ],
      },
      {
        ...sharedOption,
        geo: [
          {
            map: HUBEI_MAP_NAME,
            roam: false,
            silent: false,
            layoutCenter: [MAP_CENTER_X, `${MAP_CENTER_Y}%`],
            layoutSize: MAP_LAYOUT_SIZE,
            aspectScale: MAP_ASPECT_SCALE,
            z: 5,
            selectedMode: false,
            label: {
              show: true,
              color: "rgba(226, 252, 255, 0.82)",
              fontFamily:
                '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
              fontSize: 25,
              fontWeight: 500,
              textBorderColor: "rgba(0, 20, 30, 0.9)",
              textBorderWidth: 4,
            },
            itemStyle: {
              areaColor: MAP_BACKGROUND_COLOR,
              opacity: 0.72,
              borderColor: "rgba(32, 219, 219, 0.58)",
              borderWidth: 1.8,
            },
            emphasis: {
              label: {
                show: true,
                color: "#ffffff",
              },
              itemStyle: {
                areaColor: MAP_BACKGROUND_COLOR,
                opacity: 0.86,
                borderColor: "rgba(32, 219, 219, 0.9)",
                borderWidth: 2.4,
              },
            },
            select: { disabled: true },
          },
          {
            map: HUBEI_OUTLINE_NAME,
            roam: false,
            silent: true,
            layoutCenter: [MAP_CENTER_X, `${MAP_CENTER_Y}%`],
            layoutSize: MAP_LAYOUT_SIZE,
            aspectScale: MAP_ASPECT_SCALE,
            z: 8,
            label: { show: false },
            itemStyle: {
              areaColor: "rgba(0, 0, 0, 0)",
              borderColor: "rgba(32, 219, 219, 0.32)",
              borderWidth: 11,
              shadowBlur: 34,
              shadowColor: "rgba(32, 219, 219, 0.95)",
            },
            emphasis: { disabled: true },
            select: { disabled: true },
          },
          {
            map: HUBEI_OUTLINE_NAME,
            roam: false,
            silent: true,
            layoutCenter: [MAP_CENTER_X, `${MAP_CENTER_Y}%`],
            layoutSize: MAP_LAYOUT_SIZE,
            aspectScale: MAP_ASPECT_SCALE,
            z: 9,
            label: { show: false },
            itemStyle: {
              areaColor: "rgba(0, 0, 0, 0)",
              borderColor: MAP_GLOW_COLOR,
              borderWidth: 3.2,
              shadowBlur: 16,
              shadowColor: MAP_GLOW_COLOR,
            },
            emphasis: { disabled: true },
            select: { disabled: true },
          },
        ],
      },
    ];
  }, []);

  return (
    <MapRoot role="img" aria-label="湖北省地市分布地图">
      <Chart
        option={stackOption}
        use={[GeoComponent]}
        style={{ position: "absolute", inset: 0, zIndex: 1 }}
      />
      <DemLayer src={hubeiDem} alt="" aria-hidden="true" />
      <Chart
        option={mainOption}
        use={[GeoComponent]}
        style={{ position: "absolute", inset: 0, zIndex: 3 }}
      />
    </MapRoot>
  );
}
