import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import { Quaternion, Vector3 } from "three";

import hbMainPorts from "@/assets/hb-main-port.json";
import { useScreenBaseDataStore } from "@/store/useScreenBaseData";

import {
  buildXinjiangCoalPoiEntry,
  poiData,
  type RecommendRoute,
  type XinjiangCoalPoiSegment,
} from "../../../recommendLineRoutes";
import { resolvePoiLabelCollisions } from "../../poiLabelCollision";
import { calculateMapHtmlPosition } from "../../threeShared";
import {
  AIR_PLANE_SIZE,
  POI_LINE_Z,
  POI_NODE_Z,
  POI_RING_WUHAN,
  POI_SEGMENT_COLORS,
} from "../constants";
import { bakePoiPoint, getRegionIdAt, getRegionScaleAt } from "../routeLayout";
import {
  EuropePoiLabel,
  EuropePoiLeader,
  PoiLabel,
  PoiMarkerWrap,
  PoiNode,
  XinjiangCoalPulseNode,
} from "../styled";
import type { ProjectedRouteLayout } from "../types";
import RouteSegment from "./RouteSegment";
import { isPointInHubei } from "@/utils/geo";

const EUROPE_REGION_ID = "out-europe";
const EUROPE_VISUAL_SCALE = 0.6;
const WUHAN_MARKER = {
  color: POI_RING_WUHAN,
  isWuhan: true,
  label: "武汉",
  lat: 30.596751149509924,
  lng: 114.29797353909882,
} as const;

/** 精品线路 POI 层：按类型画虚线路线，并在有名称的途经点渲染节点图标与标签。 */
function RoutePoiLayerBase({
  layout,
  route,
}: {
  layout: ProjectedRouteLayout;
  route: RecommendRoute;
}) {
  const isAirRoute = route.label === "楚天翼连";
  const isXinjiangCoal = route.label === "疆煤入鄂";
  // 疆煤入鄂使用接口动态数据（异步到达后自动重渲染），其余线路使用静态 poiData
  const xinjiangCoalRoutes = useScreenBaseDataStore(
    (s) => s.xinjiangCoalRoutes,
  );
  const segments = useMemo(() => {
    const poi =
      route.label === "疆煤入鄂"
        ? buildXinjiangCoalPoiEntry(xinjiangCoalRoutes)
        : poiData.find((entry) => entry.key === route.label);
    if (!poi) return [];

    let europeMarkerIndex = 0;
    const renderedEuropePointKeys = new Set<string>();
    return poi.poiInfo.map((segment, segmentIndex) => {
      // 先烘焙 xy 并记录各控制点所在区域 scale。
      const bakedPoints = segment.routes.map((point) => {
        const [x, y] = bakePoiPoint(layout, point.value[0], point.value[1]);
        const regionId = getRegionIdAt(layout, point.value[0], point.value[1]);
        return {
          isEurope: isAirRoute && regionId === EUROPE_REGION_ID,
          isXinjiangCoalAndHbPoint:
            isXinjiangCoal && isPointInHubei(point.value[0], point.value[1]),
          isTransit: point.isTransit === true,
          name: point.name,
          regionId,
          x,
          y,
          scale: getRegionScaleAt(layout, point.value[0], point.value[1]),
        };
      });
      const isEuropeSegment =
        isAirRoute &&
        bakedPoints.every((point) => point.regionId === EUROPE_REGION_ID);
      // 整条航线统一悬浮于所有途经区域顶面上方：线高/节点高都用最大
      // scale 抬升，避免曲线在跨区域过渡段塌到高 scale 区域顶面之下
      // （如楚天翼连中被放大 1.28 倍的中国地图，其顶面远高于周边小图）。
      const lineScale = Math.max(...bakedPoints.map((point) => point.scale), 1);
      const points = bakedPoints.map((point) => {
        let showMarker = Boolean(point.name);
        if (showMarker && point.isEurope) {
          const pointKey = `${point.name}:${point.x}:${point.y}`;
          if (renderedEuropePointKeys.has(pointKey)) {
            showMarker = false;
          } else {
            renderedEuropePointKeys.add(pointKey);
          }
        }

        return {
          collisionIndex:
            point.isEurope && showMarker ? europeMarkerIndex++ : undefined,
          isEurope: point.isEurope,
          isTransit: point.isTransit,
          isXinjiangCoalAndHbPoint: point.isXinjiangCoalAndHbPoint,
          name: point.name,
          showMarker,
          position: [point.x, point.y, POI_LINE_Z * lineScale] as [
            number,
            number,
            number,
          ],
          nodePosition: [point.x, point.y, POI_NODE_Z * lineScale] as [
            number,
            number,
            number,
          ],
        };
      });
      return {
        type: segment.type,
        // 疆煤入鄂按 line 统一配色（同一 line 内所有 path 同色），
        // 其余静态线路按 segment 依次取色，超出调色板后循环
        color: isXinjiangCoal
          ? POI_SEGMENT_COLORS[
              (segment as XinjiangCoalPoiSegment).lineIndex %
                POI_SEGMENT_COLORS.length
            ]
          : POI_SEGMENT_COLORS[segmentIndex % POI_SEGMENT_COLORS.length],
        points,
        positions: points.map((point) => point.position),
        visualScale: isEuropeSegment ? EUROPE_VISUAL_SCALE : 1,
      };
    });
  }, [isAirRoute, isXinjiangCoal, layout, route.label, xinjiangCoalRoutes]);

  const xinjiangCoalMarkers = useMemo(() => {
    if (!isXinjiangCoal) return [];

    return [
      WUHAN_MARKER,
      ...hbMainPorts.map((port) => ({
        color: port.color,
        isWuhan: false as const,
        label: port.label,
        lat: Number(port.lat),
        lng: Number(port.lng),
      })),
    ]
      .filter(
        (marker) =>
          Number.isFinite(marker.lng) && Number.isFinite(marker.lat),
      )
      .map((marker) => {
        const [x, y] = bakePoiPoint(layout, marker.lng, marker.lat);
        const scale = getRegionScaleAt(layout, marker.lng, marker.lat);
        return {
          ...marker,
          position: [x, y, POI_NODE_Z * scale] as [number, number, number],
        };
      });
  }, [isXinjiangCoal, layout]);

  const europeMarkerCount = useMemo(
    () =>
      segments.reduce(
        (count, segment) =>
          count +
          segment.points.filter((point) => point.collisionIndex !== undefined)
            .length,
        0,
      ),
    [segments],
  );
  const europeMarkerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const collisionFramesRef = useRef(3);
  const lastCameraPositionRef = useRef<Vector3 | null>(null);
  const lastCameraQuaternionRef = useRef<Quaternion | null>(null);
  const lastCanvasSizeRef = useRef<[number, number]>([0, 0]);

  useFrame((state) => {
    const cameraMoved =
      lastCameraPositionRef.current === null ||
      lastCameraPositionRef.current.distanceToSquared(state.camera.position) >
        0.000001 ||
      lastCameraQuaternionRef.current === null ||
      1 -
        Math.abs(lastCameraQuaternionRef.current.dot(state.camera.quaternion)) >
        0.000001;
    const canvasResized =
      lastCanvasSizeRef.current[0] !== state.size.width ||
      lastCanvasSizeRef.current[1] !== state.size.height;
    const markers = europeMarkerRefs.current.slice(0, europeMarkerCount);
    const markersReady =
      europeMarkerCount > 0 &&
      markers.length === europeMarkerCount &&
      markers.every(Boolean);

    if (cameraMoved || canvasResized) collisionFramesRef.current = 2;
    if (europeMarkerCount > 0 && !markersReady) {
      collisionFramesRef.current = 3;
    }
    if (markersReady && collisionFramesRef.current > 0) {
      resolvePoiLabelCollisions(markers, { placement: "below" });
      collisionFramesRef.current -= 1;
    }

    if (!lastCameraPositionRef.current) {
      lastCameraPositionRef.current = new Vector3();
    }
    lastCameraPositionRef.current.copy(state.camera.position);
    if (!lastCameraQuaternionRef.current) {
      lastCameraQuaternionRef.current = new Quaternion();
    }
    lastCameraQuaternionRef.current.copy(state.camera.quaternion);
    lastCanvasSizeRef.current = [state.size.width, state.size.height];
  });

  return (
    <>
      {segments.map((segment, segmentIndex) => {
        if (segment.points.length < 2) return null;

        return (
          <group key={isAirRoute ? `air-${segmentIndex}` : segmentIndex}>
            <RouteSegment
              color={segment.color}
              planeSize={AIR_PLANE_SIZE / layout.fitScale}
              points={segment.positions}
              showFlyDots={segment.type !== "airway"}
              showPlane={isAirRoute && segment.type === "airway"}
              visualScale={segment.visualScale}
            />

            {segment.points.map((point, pointIndex) => {
              if (!point.name || !point.showMarker) return null;
              const [nodeX, nodeY, nodeZ] = point.nodePosition;
              const collisionIndex = point.collisionIndex;
              return (
                <Html
                  calculatePosition={calculateMapHtmlPosition}
                  key={`${point.name}-${pointIndex}`}
                  center
                  eps={0}
                  position={[nodeX, nodeY, nodeZ]}
                  distanceFactor={22 / layout.fitScale}
                  zIndexRange={[30, 0]}
                >
                  <PoiMarkerWrap
                    $scale={point.isEurope ? EUROPE_VISUAL_SCALE : undefined}
                    ref={
                      collisionIndex === undefined
                        ? undefined
                        : (element) => {
                            europeMarkerRefs.current[collisionIndex] = element;
                            collisionFramesRef.current = 3;
                          }
                    }
                  >
                    {point.isEurope && <EuropePoiLeader aria-hidden="true" />}
                    <PoiNode
                      $isTransit={point.isTransit}
                      $isWuhan={point.name === "武汉"}
                      data-poi-icon={point.isEurope ? "" : undefined}
                    />
                    {point.isEurope ? (
                      <EuropePoiLabel data-poi-label>
                        {point.name}
                      </EuropePoiLabel>
                    ) : (
                      (!isXinjiangCoal ||
                        !point.isXinjiangCoalAndHbPoint) && (
                        <PoiLabel
                          $isAirRoute={isAirRoute}
                          $isXinjiangCoal={isXinjiangCoal}
                          $isHbPoi={point.isXinjiangCoalAndHbPoint}
                        >
                          {point.name}
                        </PoiLabel>
                      )
                    )}
                  </PoiMarkerWrap>
                </Html>
              );
            })}
          </group>
        );
      })}

      {xinjiangCoalMarkers.map((marker) => (
        <Html
          calculatePosition={calculateMapHtmlPosition}
          key={`xinjiang-coal-marker-${marker.label}`}
          center
          eps={0}
          position={marker.position}
          distanceFactor={22 / layout.fitScale}
          zIndexRange={[35, 0]}
        >
          <PoiMarkerWrap aria-label={marker.label}>
            <XinjiangCoalPulseNode
              $color={marker.color}
              $size={marker.isWuhan ? 32 : 24}
              data-poi-icon
            />
            {marker.isWuhan && (
              <PoiLabel $isXinjiangCoal data-poi-label>
                {marker.label}
              </PoiLabel>
            )}
          </PoiMarkerWrap>
        </Html>
      ))}
    </>
  );
}
const RoutePoiLayer = memo(RoutePoiLayerBase);

export default RoutePoiLayer;
