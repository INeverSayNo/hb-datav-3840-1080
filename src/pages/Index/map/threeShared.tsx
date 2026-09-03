/* eslint-disable react-refresh/only-export-components */
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Line, shaderMaterial, useTexture } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import styled from "styled-components";
import {
  AdditiveBlending,
  type Camera,
  Color,
  type Object3D,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from "three";

import worldTerrain from "@/assets/scene-transparent.webp";
import { useScreenLayout } from "@/hooks/useScreenLayout";

/** 地图挤出厚度（地图整体宽度约 21 个投影单位）。 */
export const MAP_DEPTH = 0.66;
export const MAP_GLOW_COLOR = "#20dbdb";
export const OUTLINE_WIDTH = 2;

/**
 * 共享的挤出参数。必须是稳定引用：R3F 对 `args` 做浅比较，
 * 传对象字面量会让 ExtrudeGeometry 每次 render 重新三角化。
 */
export const MAP_EXTRUDE_OPTIONS = {
  depth: MAP_DEPTH,
  bevelEnabled: false,
  curveSegments: 2,
};

const SOFT_GLOW_COLOR = MAP_GLOW_COLOR;
const GLOW_EMISSIVE_COLOR = new Color(MAP_GLOW_COLOR).multiplyScalar(2.6);
const WORLD_ASPECT = 1478 / 2262;
const WORLD_WIDTH = 92;
const WORLD_HUBEI_U = 0.435;
const WORLD_HUBEI_V = 0.376;
const htmlWorldPosition = new Vector3();
const htmlProjectedPosition = new Vector3();

/**
 * Drei Html 默认只根据屏幕坐标判断是否更新。zoomToCursor 会让光标下的
 * 锚点保持不动，因此需要把相机距离编码成不可见的亚像素偏移，确保缩放
 * 期间 distanceFactor 仍会重新计算；静止后不会产生额外 DOM 更新。
 */
export function calculateMapHtmlPosition(
  object: Object3D,
  camera: Camera,
  size: { width: number; height: number },
) {
  object.getWorldPosition(htmlWorldPosition);
  htmlProjectedPosition.copy(htmlWorldPosition).project(camera);

  return [
    htmlProjectedPosition.x * (size.width / 2) +
      size.width / 2 +
      htmlWorldPosition.distanceTo(camera.position) * 0.00001,
    -htmlProjectedPosition.y * (size.height / 2) + size.height / 2,
  ];
}

export const MapRoot = styled.section`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 0 16px rgba(32, 219, 219, 0.4))
    drop-shadow(0 0 42px rgba(32, 219, 219, 0.18));
`;

export const MapLabel = styled.div<{$fontSize?: string}>`
  color: rgba(232, 250, 255, 0.9);
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  text-shadow:
    0 2px 4px rgba(0, 18, 28, 0.95),
    0 0 6px rgba(0, 18, 28, 0.9);
   ${(props) => ({
    fontSize: props.$fontSize ?? "22px",
  })}
`;

/** 顶面材质：把卫星图亮度重新映射为蓝青色地形。 */
export const TerrainTopMaterial = extend(
  shaderMaterial(
    {
      uMap: null as Texture | null,
      uDeep: new Color("#289ec0"),
      uMid: new Color("#20dbdb"),
      uHigh: new Color("#55e2ff"),
      uOpacity: 1,
    },
    /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    /* glsl */ `
    uniform sampler2D uMap;
    uniform vec3 uDeep;
    uniform vec3 uMid;
    uniform vec3 uHigh;
    uniform float uOpacity;
    varying vec2 vUv;

    void main() {
      vec3 tex = texture2D(uMap, vUv).rgb;
      float luma = dot(tex, vec3(0.299, 0.587, 0.114));
      luma = pow(clamp(luma * 1.5, 0.0, 1.0), 0.85);

      vec3 color = mix(uDeep, uMid, smoothstep(0.0, 0.55, luma));
      color = mix(color, uHigh, smoothstep(0.55, 1.0, luma));
      gl_FragColor = vec4(color, uOpacity);
    }`,
  ),
);

/** 侧面材质：深海蓝渐变，并带缓慢上移的扫光。 */
export const TerrainSideMaterial = extend(
  shaderMaterial(
    {
      uTime: 0,
      uDepth: MAP_DEPTH,
      uTop: new Color("#2aa4e6"),
      uBottom: new Color("#041f3a"),
      uScan: new Color("#57e6ff"),
    },
    /* glsl */ `
    varying float vHeight;
    void main() {
      vHeight = position.z;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    /* glsl */ `
    uniform float uTime;
    uniform float uDepth;
    uniform vec3 uTop;
    uniform vec3 uBottom;
    uniform vec3 uScan;
    varying float vHeight;

    void main() {
      float h = clamp(vHeight / uDepth, 0.0, 1.0);
      vec3 color = mix(uBottom, uTop, pow(h, 1.35));

      float band = fract(uTime * 0.28);
      float scan = smoothstep(0.18, 0.0, abs(h - band));
      color = mix(color, uScan, scan * 0.55);

      gl_FragColor = vec4(color, mix(0.55, 0.95, h));
    }`,
  ),
);

const WorldBaseMaterial = extend(
  shaderMaterial(
    {
      uMap: null as Texture | null,
      uDeep: new Color("#0c3050"),
      uHigh: new Color("#55c4e8"),
      uOpacity: 1,
    },
    /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    /* glsl */ `
    uniform sampler2D uMap;
    uniform vec3 uDeep;
    uniform vec3 uHigh;
    uniform float uOpacity;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(uMap, vUv);
      float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
      vec3 color = mix(uDeep, uHigh, smoothstep(0.05, 0.9, luma));
      float alpha = tex.a * (0.05 + luma * 0.3) * uOpacity;
      gl_FragColor = vec4(color, alpha);
    }`,
  ),
);

/** 补偿 AutoFit 的 CSS 缩放，使两张地图的鼠标手感一致。 */
export function useControlSpeed() {
  const { scale } = useScreenLayout();

  return Math.min(4, 1 / Math.max(scale, 0.2));
}

export function WorldBase({
  hubeiAnchor = [0, 0],
}: {
  hubeiAnchor?: [number, number];
}) {
  const texture = useTexture(worldTerrain);
  const height = WORLD_WIDTH * WORLD_ASPECT;
  const offsetX = hubeiAnchor[0] + (0.5 - WORLD_HUBEI_U) * WORLD_WIDTH;
  const offsetY = hubeiAnchor[1] + (WORLD_HUBEI_V - 0.5) * height;

  useLayoutEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh position={[offsetX, offsetY, -0.12]} raycast={() => null}>
      <planeGeometry args={[WORLD_WIDTH, height]} />
      <WorldBaseMaterial
        transparent
        depthWrite={false}
        uMap={texture}
        uOpacity={0.9}
      />
    </mesh>
  );
}

export function OutlineGlow({
  rings,
}: {
  rings: [number, number, number][][];
}) {
  const segments = rings.flatMap((ring) => {
    const ringSegments: [number, number, number][] = [];
    for (let index = 1; index < ring.length; index += 1) {
      ringSegments.push(ring[index - 1], ring[index]);
    }
    return ringSegments;
  });

  if (segments.length === 0) return null;

  return (
    <group>
      <Line
        points={segments}
        segments
        lineWidth={OUTLINE_WIDTH * 4}
        color={MAP_GLOW_COLOR}
        transparent
        opacity={0.16}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        renderOrder={11}
        raycast={() => null}
      />
      <Line
        points={segments}
        segments
        lineWidth={OUTLINE_WIDTH * 14}
        color={SOFT_GLOW_COLOR}
        transparent
        opacity={0.01}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        renderOrder={12}
        raycast={() => null}
      />
      <Line
        points={segments}
        segments
        lineWidth={OUTLINE_WIDTH}
        color={GLOW_EMISSIVE_COLOR}
        toneMapped={false}
        renderOrder={13}
        raycast={() => null}
      />
    </group>
  );
}

/** 只在未就绪时挂载，触发后由父组件卸载以退订 useFrame。 */
export function FirstFrameProbe({ onFrame }: { onFrame: () => void }) {
  useFrame(onFrame);
  return null;
}

/** 在当前 Suspense 场景的资源全部就绪并完成首帧后通知外层。 */
export function SceneReady({ onReady }: { onReady?: () => void }) {
  const [signalled, setSignalled] = useState(false);
  const hasSignalled = useRef(false);

  const handleFrame = useCallback(() => {
    if (hasSignalled.current) return;
    hasSignalled.current = true;
    onReady?.();
    // 卸载探针，避免此后每帧空转一次布尔判断。
    setSignalled(true);
  }, [onReady]);

  if (signalled) return null;
  return <FirstFrameProbe onFrame={handleFrame} />;
}

export { GLOW_EMISSIVE_COLOR };
