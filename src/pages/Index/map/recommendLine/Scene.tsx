import { Line } from "@react-three/drei";
import { memo } from "react";
import { AdditiveBlending } from "three";

import type { RecommendRoute } from "../../recommendLineRoutes";
import { SceneReady } from "../threeShared";
import MapInsetFrame from "./components/MapInsetFrame";
import MapRegionMesh from "./components/MapRegionMesh";
import RoutePoiLayer from "./components/RoutePoiLayer";
import { MAP_INSET_DASH_Z, RECOMMEND_CHINA_THEME } from "./constants";
import { isInsetKind } from "./sources";
import type { PreparedRoute } from "./types";

function RecommendLineSceneBase({
  onReady,
  prepared,
  route,
}: {
  onReady: () => void;
  prepared: PreparedRoute;
  route: RecommendRoute;
}) {
  const { layout, textures } = prepared;
  const labelDistanceFactor = 22 / layout.fitScale;

  return (
    <group scale={layout.fitScale}>
      <group position={[-layout.center.x, -layout.center.y, 0]}>
        {layout.regions.map((region) => (
          <group
            key={region.id}
            position={region.transform?.position ?? [0, 0, 0]}
            scale={region.transform?.scale ?? 1}
          >
            <MapRegionMesh
              labelDistanceFactor={labelDistanceFactor}
              region={region}
              showLabel={
                !isInsetKind(region.kind) &&
                (layout.viewMode !== "world" || region.kind === "china")
              }
              texture={textures.get(region.id)}
            />
            {isInsetKind(region.kind) && (
              <>
                {/* 岛礁轮廓：细线单独渲染，不走主体那对粗光晕 */}
                {region.boundarySegments.length > 0 && (
                  <Line
                    points={region.boundarySegments}
                    segments
                    lineWidth={1}
                    color={RECOMMEND_CHINA_THEME.boundary}
                    transparent
                    opacity={0.85}
                    depthWrite={false}
                    toneMapped={false}
                    renderOrder={9}
                    raycast={() => null}
                  />
                )}
                {/* 十段线：国界标记，比岛礁轮廓更粗更亮 */}
                {region.lineSegments.length > 0 && (
                  <group position={[0, 0, MAP_INSET_DASH_Z]}>
                    <Line
                      points={region.lineSegments}
                      segments
                      lineWidth={5}
                      color={RECOMMEND_CHINA_THEME.glow}
                      transparent
                      opacity={0.35}
                      blending={AdditiveBlending}
                      depthWrite={false}
                      toneMapped={false}
                      renderOrder={10}
                      raycast={() => null}
                    />
                    <Line
                      points={region.lineSegments}
                      segments
                      lineWidth={2.4}
                      color={RECOMMEND_CHINA_THEME.boundary}
                      transparent
                      opacity={1}
                      depthWrite={false}
                      toneMapped={false}
                      renderOrder={11}
                      raycast={() => null}
                    />
                  </group>
                )}
              </>
            )}
            {region.insetFrame && (
              <MapInsetFrame
                routeName={route.label}
                frame={region.insetFrame}
                labelDistanceFactor={labelDistanceFactor}
                title={region.label}
              />
            )}
          </group>
        ))}
        {layout.boundarySegments.length > 0 && (
          <Line
            points={layout.boundarySegments}
            segments
            lineWidth={0.75}
            color="#8fe9ff"
            transparent
            opacity={0.52}
            depthWrite={false}
            toneMapped={false}
            renderOrder={9}
            raycast={() => null}
          />
        )}
        {layout.chinaBoundarySegments.length > 0 && (
          <group>
            <Line
              points={layout.chinaBoundarySegments}
              segments
              lineWidth={5}
              color={RECOMMEND_CHINA_THEME.glow}
              transparent
              opacity={RECOMMEND_CHINA_THEME.glowOpacity}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
              renderOrder={8}
              raycast={() => null}
            />
            <Line
              points={layout.chinaBoundarySegments}
              segments
              lineWidth={0.9}
              color={RECOMMEND_CHINA_THEME.boundary}
              transparent
              opacity={0.82}
              depthWrite={false}
              toneMapped={false}
              renderOrder={9}
              raycast={() => null}
            />
          </group>
        )}
        <RoutePoiLayer layout={layout} route={route} />
        <SceneReady key={layout.mapKey} onReady={onReady} />
      </group>
    </group>
  );
}
const RecommendLineScene = memo(RecommendLineSceneBase);

export default RecommendLineScene;
