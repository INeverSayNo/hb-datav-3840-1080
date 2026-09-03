import { Html, Line } from "@react-three/drei";
import { memo, useMemo } from "react";
import { AdditiveBlending, DoubleSide } from "three";

import { MapLabel, calculateMapHtmlPosition } from "../../threeShared";
import {
  MAP_INSET_BACKDROP_Z,
  MAP_INSET_FRAME_Z,
  RECOMMEND_CHINA_THEME,
} from "../constants";
import type { ProjectedMapRegion } from "../types";

/**
 * 嵌图外框（南海诸岛角标）。
 *
 * 坐标是 region 的**局部**坐标，而外层 group 已经带上了 transform.position /
 * transform.scale，所以边框天生吸附嵌图——相机的平移/缩放/旋转全开，用 DOM
 * 覆盖层做的话一拖就脱开了。
 *
 * 线宽走 drei Line（Line2），lineWidth 单位是**屏幕像素**，不会随 0.21–0.67
 * 的嵌图缩放变细。
 */
function MapInsetFrameBase({
  frame,
  labelDistanceFactor,
  title,
  routeName,
}: {
  frame: NonNullable<ProjectedMapRegion["insetFrame"]>;
  labelDistanceFactor: number;
  title?: string;
  routeName?: string;
}) {
  const [x0, y0] = frame.min;
  const [x1, y1] = frame.max;

  // points / args 必须是稳定引用：drei Line 和 R3F 都按引用重建几何体。
  const ring = useMemo<[number, number, number][]>(
    () => [
      [x0, y0, MAP_INSET_FRAME_Z],
      [x1, y0, MAP_INSET_FRAME_Z],
      [x1, y1, MAP_INSET_FRAME_Z],
      [x0, y1, MAP_INSET_FRAME_Z],
      [x0, y0, MAP_INSET_FRAME_Z],
    ],
    [x0, x1, y0, y1],
  );
  const planeArgs = useMemo<[number, number]>(
    () => [x1 - x0, y1 - y0],
    [x0, x1, y0, y1],
  );

  const getFontSize = useMemo(
    () => (routeName === "楚天翼连" ? "12px" : "26px"),
    [routeName],
  );

  return (
    <group>
      <mesh
        position={[(x0 + x1) / 2, (y0 + y1) / 2, MAP_INSET_BACKDROP_Z]}
        raycast={() => null}
      >
        <planeGeometry args={planeArgs} />
        <meshBasicMaterial
          color={RECOMMEND_CHINA_THEME.sideBottom}
          transparent
          opacity={0.42}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <Line
        points={ring}
        lineWidth={6}
        color={RECOMMEND_CHINA_THEME.glow}
        transparent
        opacity={0.3}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        renderOrder={8}
        raycast={() => null}
      />
      <Line
        points={ring}
        lineWidth={2}
        color={RECOMMEND_CHINA_THEME.boundary}
        transparent
        opacity={0.95}
        depthWrite={false}
        toneMapped={false}
        renderOrder={9}
        raycast={() => null}
      />
      {title && (
        <Html
          calculatePosition={calculateMapHtmlPosition}
          center
          eps={0}
          position={[(x0 + x1) / 2, y1, MAP_INSET_FRAME_Z]}
          distanceFactor={labelDistanceFactor}
          zIndexRange={[20, 0]}
        >
          <MapLabel $fontSize={getFontSize}>{title}</MapLabel>
        </Html>
      )}
    </group>
  );
}

const MapInsetFrame = memo(MapInsetFrameBase);

export default MapInsetFrame;
