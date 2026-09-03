import styled, { css } from "styled-components";

import {
  POI_INNER_WHITE,
  POI_RING_NORMAL,
  POI_RING_TRANSIT,
  POI_RING_WUHAN,
} from "./constants";
import type { MapTransitionPhase } from "./types";

export const MapCanvasLayer = styled.div<{
  $duration: number;
  $phase: MapTransitionPhase;
}>`
  width: 100%;
  height: 100%;
  opacity: ${({ $phase }) =>
    $phase === "visible" || $phase === "entering" ? 1 : 0};
  transform: ${({ $phase }) =>
    $phase === "hidden" || $phase === "exiting" ? "scale(0.985)" : "scale(1)"};
  transform-origin: 50% 52%;
  pointer-events: ${({ $phase }) => ($phase === "visible" ? "auto" : "none")};
  transition:
    opacity ${({ $duration }) => $duration}ms cubic-bezier(0.22, 1, 0.36, 1),
    transform ${({ $duration }) => $duration}ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

/** 节点 + 标签的定位容器（中心对齐到 position）。 */
export const PoiMarkerWrap = styled.div<{ $scale?: number }>`
  position: relative;
  width: 0;
  height: 0;
  pointer-events: none;

  ${({ $scale }) =>
    $scale !== undefined &&
    css`
      transform: scale(${$scale});
      transform-origin: 0 0;
    `}
`;

/** 疆煤入鄂专用呼吸灯：武汉与港区共用，通过 size/color 区分层级。 */
export const XinjiangCoalPulseNode = styled.div<{
  $color: string;
  $size: number;
}>`
  position: absolute;
  left: ${({ $size }) => -$size / 2}px;
  top: ${({ $size }) => -$size / 2}px;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  box-sizing: border-box;
  border: 3px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow:
    0 0 10px ${({ $color }) => `${$color}cc`},
    0 0 22px ${({ $color }) => `${$color}88`};
  transform-origin: center;
  animation: xinjiang-coal-breathe 1.8s ease-in-out infinite;

  &::before {
    content: "";
    position: absolute;
    inset: -45%;
    border: 2px solid ${({ $color }) => $color};
    border-radius: 50%;
    opacity: 0;
    animation: xinjiang-coal-ripple 1.8s ease-out infinite;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 28%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.9);
  }

  @keyframes xinjiang-coal-breathe {
    0%,
    100% {
      transform: scale(0.92);
      opacity: 0.88;
    }
    50% {
      transform: scale(1.12);
      opacity: 1;
      box-shadow:
        0 0 16px ${({ $color }) => `${$color}ee`},
        0 0 34px ${({ $color }) => `${$color}aa`};
    }
  }

  @keyframes xinjiang-coal-ripple {
    0% {
      transform: scale(0.55);
      opacity: 0.8;
    }
    75%,
    100% {
      transform: scale(1.25);
      opacity: 0;
    }
  }
`;

/** 节点图标：外环 3px（蓝/红）+ 白色内环 6px（约为外环 2 倍）。 */
export const PoiNode = styled.div<{
  $isTransit?: boolean;
  $isWuhan?: boolean;
}>`
  position: absolute;
  left: -13px;
  top: -13px;
  width: 26px;
  height: 26px;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid
      ${({ $isTransit, $isWuhan }) =>
        $isWuhan
          ? POI_RING_WUHAN
          : $isTransit
            ? POI_RING_TRANSIT
            : POI_RING_NORMAL};
    box-shadow: 0 0 10px
      ${({ $isTransit, $isWuhan }) =>
        $isWuhan
          ? "rgba(255, 77, 79, 0.7)"
          : $isTransit
            ? "rgba(255, 140, 66, 0.75)"
            : "rgba(47, 140, 255, 0.7)"};
  }

  &::after {
    content: "";
    position: absolute;
    inset: 3px;
    border-radius: 50%;
    border: 6px solid ${POI_INNER_WHITE};
  }
`;

/** 标签上移后连接节点与标签的指向性线条（样式与 three.tsx 的 PoiLeader 一致）。 */
export const PoiLeader = styled.i`
  position: absolute;
  top: var(--poi-leader-top, 0px);
  left: 50%;
  z-index: 1;
  display: var(--poi-leader-display, none);
  width: 4px;
  height: var(--poi-leader-height, 0px);
  transform: translateX(-50%);
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(143, 233, 255, 0.45),
    rgba(85, 226, 255, 0.95)
  );
  box-shadow: 0 0 7px rgba(32, 219, 219, 0.75);

  &::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: -1px;
    width: 9px;
    height: 9px;
    border-right: 3px solid #8fe9ff;
    border-bottom: 3px solid #8fe9ff;
    transform: translateX(-50%) rotate(45deg);
  }
`;

/** Europe 标签下移时使用的细导引线。 */
export const EuropePoiLeader = styled(PoiLeader)`
  width: 2px;
  box-shadow: 0 0 4px rgba(32, 219, 219, 0.65);

  &::after {
    width: 6px;
    height: 6px;
    border-right-width: 2px;
    border-bottom-width: 2px;
  }
`;

/** 节点名称：白底黑字，碰撞时向上堆叠。 */
export const PoiLabel = styled.span<{
  $isAirRoute?: boolean;
  $isXinjiangCoal?: boolean;
  $isHbPoi?: boolean;
}>`
  position: absolute;
  left: 50%;
  top: 17px;
  transform: translateX(-50%) translateY(var(--poi-label-offset-y, 0px));
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
  background: #ffffff;
  color: #000000;
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
  font-size: ${({ $isAirRoute, $isXinjiangCoal, $isHbPoi }) =>
    $isAirRoute ? 16 : $isXinjiangCoal ? ($isHbPoi ? 38 : "24") : 38}px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  padding: ${({ $isAirRoute }) => ($isAirRoute ? "5px 7px" : "10px 12px")};
  border-radius: ${({ $isAirRoute }) => ($isAirRoute ? 5 : 10)}px;

  ${(props) => ({
    background:
      props.$isXinjiangCoal && !props.$isHbPoi ? "#ffffff1f" : "#ffffff",
    boxShadow:
      props.$isXinjiangCoal && !props.$isHbPoi ? "0px 0px 5px 0px #7ec3ff" : "",
  })}
`;

/** Europe 节点名称：视觉与 three.tsx 的 POI 标签一致。 */
export const EuropePoiLabel = styled.span`
  position: absolute;
  left: 50%;
  top: 17px;
  z-index: 2;
  color: rgba(232, 250, 255, 0.95);
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
  font-size: 24px;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid rgba(32, 219, 219, 0.35);
  border-radius: 8px;
  background: #003a55c9;
  padding: 7px 10px;
  transform: translateX(-50%) translateY(var(--poi-label-offset-y, 0px));
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
`;
