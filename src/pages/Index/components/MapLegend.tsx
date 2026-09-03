import styled from "styled-components";

import airwayIcon from "@/assets/map-airway.webp";
import railwayStationIcon from "@/assets/map-railway-station.webp";
import warehouseIcon from "@/assets/map-warehouse.webp";
import waterwayPortIcon from "@/assets/map-waterway-port.webp";
import NoticeBar from "./NoticeBar";

// 位置与尺寸按 demo.png 图例面板换算到 5600x2320 设计稿坐标
const Panel = styled.section`
  width: 2050px;
  padding: 22px 30px 28px;
  box-sizing: border-box;
  border: 2px solid rgba(126, 165, 180, 0.45);
  border-radius: 12px;
  background: rgba(8, 28, 40, 0.78);
  pointer-events: none;
  display: flex;
  align-items: center;
`;

const Title = styled.h3`
  margin: 0;
  color: #f2f9fc;
  font-size: 34px;
  line-height: 44px;
  font-weight: 700;
  letter-spacing: 2px;
`;

const Grid = styled.div`
  display: flex;
  align-items: center;
  flex-grow: 1;
  padding-left: 40px;
  justify-content: space-between;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
`;

const ColorSwatch = styled.i<{ $color: string; $length: number }>`
  flex: none;
  display: inline-block;
  width: 34px;
  width: ${({ $length }) => ($length > 1 ? "17px" : "34px")};
  height: 8px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
`;

const ColorSwatchWrap = styled.p`
  width: 34px;
  height: 6px;
  display: flex;
`;

const PinIcon = styled.img`
  flex: none;
  height: 46px;
  width: auto;
`;

const Label = styled.span`
  color: #e6f2f7;
  font-size: 36px;
  line-height: 36px;
  white-space: nowrap;
`;

const NETWORK_ITEMS = [
  { label: "公路网", color: ["#ffce4d"] },
  { label: "铁路网", color: ["#848484", "#ffffff"] },
  { label: "水运网", color: ["#0074d3", "#ffffff"] },
  { label: "航空", color: ["#e11ef2"] },
];

const NODE_ITEMS = [
  { label: "核心港口", icon: waterwayPortIcon },
  { label: "站点", icon: railwayStationIcon },
  { label: "仓库", icon: warehouseIcon },
  { label: "机场", icon: airwayIcon },
];

const LegendPanel = styled.section`
  position: absolute;
  z-index: 3;
  gap: 28px;
  max-width: 4200px;
  pointer-events: none;
  left: 160px;
  top: 1550px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export default function MapLegend() {
  return (
    <LegendPanel>
      <Panel aria-label="地图图例">
        <Title>图例</Title>
        <Grid>
          {NETWORK_ITEMS.map(({ label, color }) => (
            <Item key={label}>
              <ColorSwatchWrap>
                {color.map((v, idx) => {
                  return (
                    <ColorSwatch $color={v} $length={color.length} key={idx} />
                  );
                })}
              </ColorSwatchWrap>
              <Label>{label}</Label>
            </Item>
          ))}
          {NODE_ITEMS.map(({ label, icon }) => (
            <Item key={label}>
              <PinIcon src={icon} alt="" />
              <Label>{label}</Label>
            </Item>
          ))}
        </Grid>
      </Panel>
      <NoticeBar />
    </LegendPanel>
  );
}
