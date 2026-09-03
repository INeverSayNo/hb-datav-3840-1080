import styled from "styled-components";

import leftButton from "@/assets/network-button-bg.webp";
import activeButton from "@/assets/province-logistic-network.webp";
import rightButton from "@/assets/network-button-bg.webp";

const Navigation = styled.nav`
  position: absolute;
  left: 49%;
  bottom: 0px;
  z-index: 6;
  width: 1650px;
  height: 190px;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const NavButton = styled.button<{
  $active?: boolean;
  $side?: "left" | "right";
}>`
  position: relative;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  width: ${({ $active }) => ($active ? 580 : 580)}px;
  height: ${({ $active }) => ($active ? 258 : 258)}px;
  margin: 0 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #f3feff;
  cursor: pointer;
  filter: brightness(1.12);
  transition:
    transform 160ms ease,
    filter 160ms ease;

  &:disabled {
    cursor: default;
  }

  &:not(:disabled):hover,
  &:not(:disabled):focus-visible {
    filter: brightness(1.24);
    transform: translateY(-7px);
    outline: none;
  }

  &:not(:disabled):active {
    transform: translateY(-3px) scale(0.99);
  }

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: fill;
  }
`;

const Label = styled.span<{ $active?: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: ${({ $active }) => ($active ? 4 : 16)}px;
  font-family: "YouSheBiaoTiHei", "Microsoft YaHei", sans-serif;
  font-size: 58px;
  top: 50%;
  transform: translateY(-75%);
  letter-spacing: 4px;
  text-shadow:
    0 4px 4px rgba(0, 0, 0, 0.55),
    0 0 15px rgba(89, 255, 226, 0.7);
`;

export type DashboardMapView = "wuhanChannel" | "province" | "recommendLine";

export type BottomNavigationProps = {
  activeView: DashboardMapView;
  disabled?: boolean;
  onViewIntent?: (view: DashboardMapView) => void;
  onViewChange: (view: DashboardMapView) => void;
};

export default function BottomNavigation({
  activeView,
  disabled = false,
  onViewIntent,
  onViewChange,
}: BottomNavigationProps) {
  const wuhanChannelActive = activeView === "wuhanChannel";
  const provinceActive = activeView === "province";
  const recommendLineActive = activeView === "recommendLine";

  return (
    <Navigation aria-label="大屏视图切换">
      <NavButton
        type="button"
        $active={wuhanChannelActive}
        $side="left"
        disabled={disabled}
        aria-current={wuhanChannelActive ? "page" : undefined}
        onFocus={() => onViewIntent?.("wuhanChannel")}
        onPointerEnter={() => onViewIntent?.("wuhanChannel")}
        onClick={() => onViewChange("wuhanChannel")}
      >
        <img src={wuhanChannelActive ? activeButton : leftButton} alt="" />
        <Label $active={wuhanChannelActive}>国际通道</Label>
      </NavButton>
      <NavButton
        type="button"
        $active={provinceActive}
        disabled={disabled}
        aria-current={provinceActive ? "page" : undefined}
        onFocus={() => onViewIntent?.("province")}
        onPointerEnter={() => onViewIntent?.("province")}
        onClick={() => onViewChange("province")}
      >
        <img src={provinceActive ? activeButton : leftButton} alt="" />
        <Label $active={provinceActive}>全省物流网</Label>
      </NavButton>
      <NavButton
        type="button"
        $active={recommendLineActive}
        $side="right"
        disabled={disabled}
        aria-current={recommendLineActive ? "page" : undefined}
        onFocus={() => onViewIntent?.("recommendLine")}
        onPointerEnter={() => onViewIntent?.("recommendLine")}
        onClick={() => onViewChange("recommendLine")}
      >
        <img src={recommendLineActive ? activeButton : rightButton} alt="" />
        <Label $active={recommendLineActive}>精品线路网</Label>
      </NavButton>
    </Navigation>
  );
}
