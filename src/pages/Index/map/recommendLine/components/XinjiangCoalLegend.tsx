import styled from "styled-components";

import hbMainPorts from "@/assets/hb-main-port.json";

const HbPointLegendPanel = styled.div`
  position: absolute;
  bottom: 0px;
  left: 300px;
  z-index: 3;
  display: flex;
  align-items: stretch;
  gap: 28px;
  max-width: 3200px;
  pointer-events: none;
`;

const Panel = styled.section`
  width: 868px;
  padding: 22px 30px 28px;
  box-sizing: border-box;
  border: 2px solid rgba(126, 165, 180, 0.45);
  border-radius: 12px;
  background: rgba(8, 28, 40, 0.78);
  pointer-events: none;
`;

const Title = styled.h3`
  margin-bottom: 20px;
  color: #f2f9fc;
  font-size: 34px;
  line-height: 44px;
  font-weight: 700;
  letter-spacing: 2px;
`;

const LegendGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: 52px;
  align-items: center;
  gap: 20px;
`;

const LegendItem = styled.div`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  color: rgba(242, 249, 252, 0.94);
  font-size: 34px;
  line-height: 1;
  white-space: nowrap;
`;

const ColorDot = styled.i<{ $color: string }>`
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border: 2px solid rgba(255, 255, 255, 0.75);
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 12px ${({ $color }) => `${$color}cc`};
`;

export default function XinjiangCoalLegend() {
  return (
    <HbPointLegendPanel>
      <Panel>
        <Title>疆煤入鄂主要停靠港口</Title>
        <LegendGrid>
          {hbMainPorts.map((item, index) => (
            <LegendItem key={`${item.label}-${index}`}>
              <ColorDot $color={item.color} />
              <span>{item.label}</span>
            </LegendItem>
          ))}
        </LegendGrid>
      </Panel>
    </HbPointLegendPanel>
  );
}
