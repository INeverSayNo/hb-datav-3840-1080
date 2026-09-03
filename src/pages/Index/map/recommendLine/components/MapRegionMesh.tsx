import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import type { ShaderMaterial as ThreeShaderMaterial, Texture } from "three";

import ShapeBox, { type ShapeProps } from "../../shape";
import {
  MAP_EXTRUDE_OPTIONS,
  MapLabel,
  TerrainSideMaterial,
  TerrainTopMaterial,
  calculateMapHtmlPosition,
} from "../../threeShared";
import { RECOMMEND_CHINA_THEME } from "../constants";
import type { ProjectedMapRegion } from "../types";
import { isInsetKind } from "../sources";

function MapRegionMeshBase({
  labelDistanceFactor,
  region,
  showLabel,
  texture,
}: {
  labelDistanceFactor: number;
  region: ProjectedMapRegion;
  showLabel: boolean;
  texture?: Texture;
}) {
  const sideMaterialRef = useRef<ThreeShaderMaterial>(null!);

  // 贴图参数已在 loadMapRegionTexture 内设置好；此处不再重复设置，
  // 否则 needsUpdate=true 会让已上传的大贴图整张重传 GPU。

  useFrame((_, delta) => {
    if (sideMaterialRef.current) {
      sideMaterialRef.current.uniforms.uTime.value += delta;
    }
  });

  const usesChinaTheme = region.kind === "china" || isInsetKind(region.kind);

  // 稳定 args 引用，避免 R3F 每次 render 重建 ExtrudeGeometry。
  const extrudeArgs = useMemo<ShapeProps["args"]>(
    () => [region.shapes, MAP_EXTRUDE_OPTIONS],
    [region.shapes],
  );

  return (
    <group>
      <ShapeBox bbox={region.bbox} args={extrudeArgs}>
        {texture ? (
          <TerrainTopMaterial attach="material-0" uMap={texture} />
        ) : (
          <meshBasicMaterial
            attach="material-0"
            color={usesChinaTheme ? RECOMMEND_CHINA_THEME.top : "#19799b"}
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        )}
        <TerrainSideMaterial
          attach="material-1"
          ref={sideMaterialRef}
          transparent
          uBottom={
            usesChinaTheme ? RECOMMEND_CHINA_THEME.sideBottom : undefined
          }
          uScan={usesChinaTheme ? RECOMMEND_CHINA_THEME.sideScan : undefined}
          uTop={usesChinaTheme ? RECOMMEND_CHINA_THEME.sideTop : undefined}
        />
      </ShapeBox>

      {showLabel &&
        region.labels.map(({ position, text }) => (
          <Html
            calculatePosition={calculateMapHtmlPosition}
            center
            eps={0}
            key={text}
            position={position}
            distanceFactor={labelDistanceFactor}
            zIndexRange={[20, 0]}
          >
            <MapLabel>{text}</MapLabel>
          </Html>
        ))}
    </group>
  );
}
const MapRegionMesh = memo(MapRegionMeshBase);

export default MapRegionMesh;
