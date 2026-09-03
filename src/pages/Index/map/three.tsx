import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Html, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { geoMercator } from "d3-geo";
import styled from "styled-components";
import {
  Box2,
  BufferGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  MOUSE,
  Path,
  Quaternion,
  Shape,
  ShapeUtils,
  SRGBColorSpace,
  TOUCH,
  Vector2,
  Vector3,
  type Camera,
  type Group,
  type ShaderMaterial as ThreeShaderMaterial,
} from "three";

import ShapeBox from "./shape";
import { useScaledCanvasDpr } from "@/hooks/useScreenLayout";
import {
  FirstFrameProbe,
  GLOW_EMISSIVE_COLOR,
  MAP_DEPTH,
  MAP_EXTRUDE_OPTIONS,
  MapLabel,
  MapRoot,
  OutlineGlow,
  SceneReady,
  TerrainSideMaterial,
  TerrainTopMaterial,
  WorldBase,
  calculateMapHtmlPosition,
  useControlSpeed,
} from "./threeShared";
import { HB_MAP_BBOX, HB_PROJECTION_CENTER } from "./hbProjection.generated";
import {
  hbDemLowUrl,
  loadHubeiBaseGeo,
  loadHubeiFullDem,
  type HubeiBaseGeo,
} from "./threeResources";
import RoadNetwork from "./threeRoadNetwork";
import MapWaterPort from "@/assets/map-waterway-port.webp";
import MapAirPort from "@/assets/map-airway.webp";
import MapRailwayStation from "@/assets/map-railway-station.webp";
import MapWarehouse from "@/assets/map-warehouse.webp";
import { resolvePoiLabelCollisions } from "./poiLabelCollision";
import type { PoiLabelBounds, PoiLabelPlacement } from "./poiLabelCollision";

/** 标注连线方向：top 向上连接、bottom 向下连接 */
type PoiDirection = "top" | "bottom";

type PoiListItem = {
  lat: string;
  lng: string;
  label: string;
  icon: string;
  /** 手动指定连线方向；缺省时朝距离该 POI 最近的那条地图边缘出图 */
  direction?: PoiDirection;
  color?: string;
};

const POI_PLACEMENT_BY_DIRECTION = {
  top: "above",
  bottom: "below",
} as const satisfies Record<PoiDirection, PoiLabelPlacement>;

const waterwayPoiColor = "#398ef5";
const railwayPoiColor = "#e2981e";
const warehousePoiColor = "#339701";
const airwayPoiColor = "#835dff";

const poiList: PoiListItem[] = [
  {
    lat: "30.2274",
    lng: "115.1620",
    label: "棋盘洲港区",
    icon: MapWaterPort,
    direction: "bottom",
    color: waterwayPoiColor,
  },
  {
    lat: "30.4175",
    lng: "111.2461",
    label: "云池/白洋港区",
    icon: MapWaterPort,
    color: waterwayPoiColor,
  },
  {
    lat: "30.6628",
    lng: "114.5637",
    label: "阳逻港区",
    icon: MapWaterPort,
    color: waterwayPoiColor,
  },
  {
    lat: "30.3147",
    lng: "112.2813",
    label: "盐卡港区",
    icon: MapWaterPort,
    color: waterwayPoiColor,
  },
  {
    lat: "30.4963",
    lng: "114.8275",
    label: "唐家渡港区",
    icon: MapWaterPort,
    direction: "bottom",
    color: waterwayPoiColor,
  },
  {
    lat: "30.6447",
    lng: "114.120",
    label: "吴家山站",
    icon: MapRailwayStation,
    color: railwayPoiColor,
  },
  {
    lat: "30.6681",
    lng: "114.5496",
    label: "香炉山站",
    icon: MapRailwayStation,
    color: railwayPoiColor,
  },
  {
    lat: "32.0074",
    lng: "112.2782",
    label: "襄州北站",
    icon: MapRailwayStation,
    color: railwayPoiColor,
  },
  {
    lat: "31.785793732093836",
    lng: "112.17764562598845",
    label: "小河港区",
    icon: MapWaterPort,
    color: waterwayPoiColor,
  },
  {
    lat: "30.6837",
    lng: "111.3401",
    label: "宜昌东站货场",
    icon: MapRailwayStation,
    color: railwayPoiColor,
  },

  {
    lat: "30.34",
    lng: "115.05",
    label: "花湖机场",
    icon: MapAirPort,
    direction: "bottom",
    color: airwayPoiColor,
  },
  {
    lat: "30.6341",
    lng: "114.1172",
    label: "武汉传化公路港",
    icon: MapWarehouse,
    direction: "bottom",
    color: warehousePoiColor,
  },
  {
    lat: "30.5221",
    lng: "114.8742",
    label: "黄冈禹王物流园",
    icon: MapWarehouse,
    color: warehousePoiColor,
  },
];

/** Drei Html 会在每个 POI 外创建独立 stacking context，两个区间必须互不重叠。 */
const POI_LEADER_Z_INDEX_RANGE: [number, number] = [19, 0];
const POI_LABEL_Z_INDEX_RANGE: [number, number] = [40, 20];
/** 地图轮廓采样点预算：省界外环 2000+ 点按此抽稀，够标签定位精度即可 */
const MAP_SILHOUETTE_POINT_BUDGET = 600;

const PoiMarker = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;

  img {
    position: relative;
    z-index: 2;
    width: 40px;
    height: 40px;
    object-fit: contain;
    filter: drop-shadow(0 2px 6px rgba(0, 18, 28, 0.9));
  }
`;

const PoiTextLabel = styled.span<{ $color: string | undefined }>`
  position: relative;
  z-index: 2;
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
  font-size: 32px;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid rgba(32, 219, 219, 0.35);
  border-radius: 10px;
  padding: 10px 14px;
  transform: translateY(var(--poi-label-offset-y, 0px));
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;

  i {
    margin-left: 10px;
  }
  ${(props) => ({
    color: props.$color || "rgba(232, 250, 255, 0.95)",
  })}
`;

const PoiDotMarker = styled.p<{ $color: string | undefined }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  ${(props) => ({
    background: props.$color,
  })};
`;

const PoiLeader = styled.i<{ $color: string | undefined }>`
  position: absolute;
  top: var(--poi-leader-top, 0px);
  left: 50%;
  z-index: 1;
  display: var(--poi-leader-display, none);
  width: 4px;
  height: var(--poi-leader-height, 0px);
  transform: translateX(-50%);
  pointer-events: none;
  box-shadow: 0 0 7px rgba(32, 219, 219, 0.75);
  display: flex;
  align-items: center;
  ${(props) => ({
    background:
      props.$color ||
      `linear-gradient(
    to bottom,
    rgba(143, 233, 255, 0.45),
    rgba(85, 226, 255, 0.95)
  )`,
  })};
`;

/**
 * 连接线使用与可见 marker 完全相同的尺寸，确保两个 Html 根节点的 center
 * 锚点一致；图标和文字只作为布局占位，不参与显示。
 */
const PoiLeaderMarker = styled(PoiMarker)`
  > img,
  > span {
    visibility: hidden;
  }
`;

type ProjectedCity = {
  name: string;
  center: Vector3;
};

/** 投影地图轮廓点用的暂存向量，避免每帧分配 */
const silhouetteProjection = new Vector3();

function MapMesh({ baseGeo }: { baseGeo: HubeiBaseGeo }) {
  // 低清 DEM（1414×904，约 147KB）先上屏；全清那张 2.6MB 在首帧之后命令式换入。
  const demTexture = useTexture(hbDemLowUrl);
  const topMaterialRef = useRef<ThreeShaderMaterial>(null!);
  const sideMaterialRef = useRef<ThreeShaderMaterial>(null!);
  const mapGroupRef = useRef<Group>(null);
  const poiMarkerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const poiLeaderMarkerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const collisionFramesRef = useRef(3);
  const lastCameraPositionRef = useRef(new Vector3());
  const lastCameraQuaternionRef = useRef<Quaternion | null>(null);
  const lastCanvasSizeRef = useRef<[number, number]>([0, 0]);

  const projected = useMemo(() => {
    const mapData = baseGeo.cities;
    const outlineData = baseGeo.outline;
    const projection = geoMercator()
      .center(HB_PROJECTION_CENTER)
      .translate([0, 0]);

    // bbox 是构建期算好的常量（scripts/precompute-hb-map.mjs），不再由 project()
    // 累积。原先铁路和水路也参与撑大 bbox，而 bbox 决定 DEM 贴图的 UV
    // （shape.tsx），把它们延后加载就会让贴图先小后大跳一下。
    const bbox = new Box2(
      new Vector2(HB_MAP_BBOX.minX, HB_MAP_BBOX.minY),
      new Vector2(HB_MAP_BBOX.maxX, HB_MAP_BBOX.maxY),
    );

    const project = (coordinate: number[]) => {
      const [x, y] = projection(coordinate as [number, number])!;
      return new Vector2(x, -y);
    };

    const shapes: Shape[] = [];
    outlineData.features.forEach((feature) => {
      feature.geometry.coordinates.forEach((polygon) => {
        const rings = polygon.map((ring) => ring.map(project));
        const outer = rings[0];
        if (!ShapeUtils.isClockWise(outer)) outer.reverse();

        const shape = new Shape(outer);
        rings.slice(1).forEach((ring) => {
          if (ShapeUtils.isClockWise(ring)) ring.reverse();
          shape.holes.push(new Path(ring));
        });
        shapes.push(shape);
      });
    });

    const boundaryPositions: number[] = [];
    mapData.features.forEach((feature) => {
      feature.geometry.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => {
          const points = ring.map(project);
          for (let index = 1; index < points.length; index += 1) {
            const previous = points[index - 1];
            const current = points[index];
            boundaryPositions.push(
              previous.x,
              previous.y,
              MAP_DEPTH + 0.022,
              current.x,
              current.y,
              MAP_DEPTH + 0.022,
            );
          }
        });
      });
    });

    const cityBoundaryGeometry = new BufferGeometry();
    cityBoundaryGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(boundaryPositions, 3),
    );

    // 挤出体只建一份：省界侧面/顶面用它渲染，省界描边从它派生 EdgesGeometry。
    // （原先这里另建了一份一次性的只为喂 EdgesGeometry。这些 Shape 全由多边形顶点
    // 构造，都是 LineCurve，curveSegments 对直线段无作用，所以两份三角化结果本就
    // 逐顶点相同 —— 纯属白算一遍。）
    const provinceGeometry = new ExtrudeGeometry(shapes, MAP_EXTRUDE_OPTIONS);
    const provinceEdgeGeometry = new EdgesGeometry(provinceGeometry, 18);

    // 省界顶部轮廓环（外环 + 内环），用于绘制加粗发光描边。
    // getPoints() 的结果下面算剪影时还要用，这里一次算完复用（LineCurve 下返回值
    // 是确定的，复用安全）。
    const outerRingPoints = shapes.map((shape) => shape.getPoints());
    const outlineRings: [number, number, number][][] = [];
    shapes.forEach((shape, shapeIndex) => {
      [
        outerRingPoints[shapeIndex],
        ...shape.holes.map((hole) => hole.getPoints()),
      ]
        .filter((ring) => ring.length > 1)
        .forEach((ring) => {
          outlineRings.push(
            [...ring, ring[0]].map((point) => [
              point.x,
              point.y,
              MAP_DEPTH + 0.03,
            ]),
          );
        });
    });

    const center = bbox.getCenter(new Vector2());
    const cities: ProjectedCity[] = mapData.features.map((feature) => {
      const [x, y] = projection(
        feature.properties.centroid ?? feature.properties.center,
      )!;
      return {
        name: feature.properties.name,
        center: new Vector3(x, -y, MAP_DEPTH + 0.12),
      };
    });

    const pois = poiList.map((poi) => {
      const [x, y] = projection([Number(poi.lng), Number(poi.lat)])!;
      return {
        label: poi.label,
        icon: poi.icon,
        position: new Vector3(x, -y, MAP_DEPTH + 0.2),
        placement: poi.direction
          ? POI_PLACEMENT_BY_DIRECTION[poi.direction]
          : undefined,
        color: poi.color,
      };
    });

    // 地图轮廓采样点（省界外环，顶面 + 底面各一份，把挤出侧面也算进轮廓），
    // 每次解算碰撞时投影到屏幕，供标签按本地区间就近出图。
    // 外环有 2000+ 点，按预算抽稀：标签宽度上百像素，几像素的轮廓精度已足够。
    const silhouettePoints = outerRingPoints.flat();
    const silhouetteStride = Math.max(
      1,
      Math.ceil(silhouettePoints.length / MAP_SILHOUETTE_POINT_BUDGET),
    );
    const mapSilhouette: Vector3[] = [];
    silhouettePoints.forEach((point, index) => {
      if (index % silhouetteStride !== 0) return;
      mapSilhouette.push(
        new Vector3(point.x, point.y, MAP_DEPTH),
        new Vector3(point.x, point.y, 0),
      );
    });

    return {
      bbox,
      center,
      shapes,
      cities,
      cityBoundaryGeometry,
      provinceGeometry,
      provinceEdgeGeometry,
      outlineRings,
      mapSilhouette,
      pois,
    };
  }, [baseGeo]);

  useLayoutEffect(() => {
    demTexture.colorSpace = SRGBColorSpace;
    demTexture.anisotropy = 8;
    demTexture.needsUpdate = true;
  }, [demTexture]);

  useLayoutEffect(
    () => () => {
      projected.provinceGeometry.dispose();
      projected.provinceEdgeGeometry.dispose();
      projected.cityBoundaryGeometry.dispose();
    },
    [projected],
  );

  // 首帧画出来之后再做两件事：换入全清 DEM、挂载路网图层。
  // 用 useFrame 探针而不是 requestIdleCallback —— 与 SceneReady 同一套做法，
  // 保证确实是「已经出图」而不是「浏览器空了一下」。
  const [afterFirstFrame, setAfterFirstFrame] = useState(false);
  const handleFirstFrame = useCallback(() => setAfterFirstFrame(true), []);

  useEffect(() => {
    if (!afterFirstFrame) return;
    let cancelled = false;

    void loadHubeiFullDem()
      .then((fullDem) => {
        // 命令式换 uniform，不能改 useTexture 的入参：那会重新 suspend，
        // 整个场景会被卸载成白屏。
        if (cancelled || !topMaterialRef.current) return;
        topMaterialRef.current.uniforms.uMap.value = fullDem;
      })
      .catch((error: unknown) => {
        console.error("[hb-map] 全清 DEM 加载失败，继续用低清图", error);
      });

    return () => {
      cancelled = true;
    };
  }, [afterFirstFrame]);

  const poiPlacements = useMemo(
    () => projected.pois.map((poi) => poi.placement),
    [projected.pois],
  );

  /** 轮廓投影结果缓存（client 坐标），长度固定，避免每次解算都分配 */
  const silhouetteScreen = useMemo(
    () => ({
      x: new Float64Array(projected.mapSilhouette.length),
      y: new Float64Array(projected.mapSilhouette.length),
    }),
    [projected.mapSilhouette],
  );

  /**
   * 把地图轮廓采样点投影到 client 坐标系，得到标签的出图基准。
   * 用 canvas 的 getBoundingClientRect 换算，AutoFit 的整页 CSS 缩放自动被吃掉。
   * 返回的 edgeAt 让每个标签只按自己那一段横向区间的轮廓出图，
   * 否则右侧 POI 会被统一排到全局最低/最高点，连线白白拉很长。
   */
  const measureMapBounds = useCallback(
    (camera: Camera, canvas: HTMLCanvasElement): PoiLabelBounds | undefined => {
      const group = mapGroupRef.current;
      if (!group) return undefined;

      const canvasRect = canvas.getBoundingClientRect();
      if (canvasRect.height === 0) return undefined;

      const { x: screenX, y: screenY } = silhouetteScreen;
      let mapTop = Infinity;
      let mapBottom = -Infinity;
      projected.mapSilhouette.forEach((point, index) => {
        silhouetteProjection
          .copy(point)
          .applyMatrix4(group.matrixWorld)
          .project(camera);
        const clientX =
          canvasRect.left +
          (silhouetteProjection.x * 0.5 + 0.5) * canvasRect.width;
        const clientY =
          canvasRect.top +
          (0.5 - silhouetteProjection.y * 0.5) * canvasRect.height;
        screenX[index] = clientX;
        screenY[index] = clientY;
        if (clientY < mapTop) mapTop = clientY;
        if (clientY > mapBottom) mapBottom = clientY;
      });

      return {
        mapBottom,
        mapTop,
        viewBottom: canvasRect.bottom,
        viewTop: canvasRect.top,
        edgeAt: (left, right) => {
          let top = Infinity;
          let bottom = -Infinity;
          for (let index = 0; index < screenX.length; index += 1) {
            const x = screenX[index];
            if (x < left || x > right) continue;
            const y = screenY[index];
            if (y < top) top = y;
            if (y > bottom) bottom = y;
          }
          return top === Infinity ? undefined : { bottom, top };
        },
      };
    },
    [projected.mapSilhouette, silhouetteScreen],
  );

  useFrame((state, delta) => {
    if (sideMaterialRef.current) {
      sideMaterialRef.current.uniforms.uTime.value += delta;
    }

    const cameraMoved =
      lastCameraQuaternionRef.current === null ||
      lastCameraPositionRef.current.distanceToSquared(state.camera.position) >
        0.000001 ||
      1 -
        Math.abs(lastCameraQuaternionRef.current.dot(state.camera.quaternion)) >
        0.000001;
    const canvasResized =
      lastCanvasSizeRef.current[0] !== state.size.width ||
      lastCanvasSizeRef.current[1] !== state.size.height;
    const markersReady =
      poiMarkerRefs.current.length === projected.pois.length &&
      poiMarkerRefs.current.every(Boolean) &&
      poiLeaderMarkerRefs.current.length === projected.pois.length &&
      poiLeaderMarkerRefs.current.every(Boolean);

    if (cameraMoved || canvasResized) collisionFramesRef.current = 2;
    if (!markersReady) collisionFramesRef.current = 3;

    if (markersReady && collisionFramesRef.current > 0) {
      resolvePoiLabelCollisions(poiMarkerRefs.current, {
        leaderMarkers: poiLeaderMarkerRefs.current,
        placements: poiPlacements,
        bounds: measureMapBounds(state.camera, state.gl.domElement),
      });
      collisionFramesRef.current -= 1;
    }

    lastCameraPositionRef.current.copy(state.camera.position);
    if (!lastCameraQuaternionRef.current) {
      lastCameraQuaternionRef.current = new Quaternion();
    }
    lastCameraQuaternionRef.current.copy(state.camera.quaternion);
    lastCanvasSizeRef.current[0] = state.size.width;
    lastCanvasSizeRef.current[1] = state.size.height;
  });

  return (
    <group
      ref={mapGroupRef}
      position={[-projected.center.x, -projected.center.y, 0]}
    >
      <ShapeBox bbox={projected.bbox} geometry={projected.provinceGeometry}>
        <TerrainTopMaterial
          attach="material-0"
          ref={topMaterialRef}
          uMap={demTexture}
        />
        <TerrainSideMaterial
          attach="material-1"
          ref={sideMaterialRef}
          transparent
        />
      </ShapeBox>

      <lineSegments
        geometry={projected.cityBoundaryGeometry}
        raycast={() => null}
      >
        <lineBasicMaterial
          color="#8fe9ff"
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </lineSegments>

      <lineSegments
        geometry={projected.provinceEdgeGeometry}
        renderOrder={10}
        raycast={() => null}
      >
        <lineBasicMaterial color={GLOW_EMISSIVE_COLOR} toneMapped={false} />
      </lineSegments>

      {/* 路网（高速/铁路/水运）延后到首帧之后：数据 1.03MB 二进制 + 142KB JSON，
          放进首屏关键路径会把底图一起拖慢。 */}
      {afterFirstFrame && <RoadNetwork />}
      {!afterFirstFrame && <FirstFrameProbe onFrame={handleFirstFrame} />}

      <OutlineGlow rings={projected.outlineRings} />

      {projected.pois.map((poi, poiIndex) => (
        <Html
          calculatePosition={calculateMapHtmlPosition}
          key={`${poi.label}-${poiIndex}-leader`}
          center
          position={poi.position}
          distanceFactor={18}
          eps={0}
          zIndexRange={POI_LEADER_Z_INDEX_RANGE}
        >
          <PoiLeaderMarker
            ref={(element) => {
              poiLeaderMarkerRefs.current[poiIndex] = element;
              collisionFramesRef.current = 3;
            }}
            aria-hidden="true"
          >
            <PoiLeader aria-hidden="true" $color={poi.color} />
            <PoiDotMarker $color={poi.color}></PoiDotMarker>
            <PoiTextLabel $color={poi.color}>
              <img src={poi.icon} alt="" />
              <i>{poi.label}</i>
            </PoiTextLabel>
          </PoiLeaderMarker>
        </Html>
      ))}

      {projected.pois.map((poi, poiIndex) => (
        <Html
          calculatePosition={calculateMapHtmlPosition}
          key={`${poi.label}-${poiIndex}-label`}
          center
          position={poi.position}
          distanceFactor={18}
          eps={0}
          zIndexRange={POI_LABEL_Z_INDEX_RANGE}
        >
          <PoiMarker
            ref={(element) => {
              poiMarkerRefs.current[poiIndex] = element;
              collisionFramesRef.current = 3;
            }}
          >
            <PoiDotMarker $color={poi.color}></PoiDotMarker>
            <PoiTextLabel data-poi-label $color={poi.color}>
              <img data-poi-icon src={poi.icon} alt={poi.label} />
              <i>{poi.label}</i>
            </PoiTextLabel>
          </PoiMarker>
        </Html>
      ))}

      {projected.cities.map((city) => (
        <Html
          calculatePosition={calculateMapHtmlPosition}
          key={city.name}
          center
          position={city.center}
          distanceFactor={18}
          eps={0}
          zIndexRange={POI_LABEL_Z_INDEX_RANGE}
        >
          <MapLabel>{city.name}</MapLabel>
        </Html>
      ))}
    </group>
  );
}

export type ThreeHubeiMapProps = {
  onReady?: () => void;
  /** 上层交叉淡入时标记为淡出层，冻结渲染循环。 */
  paused?: boolean;
};

export default function ThreeHubeiMap({
  onReady,
  paused = false,
}: ThreeHubeiMapProps) {
  const controlSpeed = useControlSpeed();
  const renderDpr = useScaledCanvasDpr();
  const [baseGeo, setBaseGeo] = useState<HubeiBaseGeo | null>(null);

  // 底图数据（市界 + 省界轮廓，约 360KB）改成运行时 fetch：静态 import 会被 Vite
  // 编译成 JS 内联进 chunk，把贴图下载串行堵在后面。
  useEffect(() => {
    let cancelled = false;
    void loadHubeiBaseGeo()
      .then((geo) => {
        if (!cancelled) setBaseGeo(geo);
      })
      .catch((error: unknown) => {
        console.error("[hb-map] 底图数据加载失败", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MapRoot role="img" aria-label="湖北省三维地形地图">
      <Canvas
        dpr={renderDpr}
        resize={{ offsetSize: true }}
        // 被上层标记为淡出时冻结渲染循环，避免交叉淡入期间两个 WebGL 场景同时满帧。
        frameloop={paused ? "demand" : "always"}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: 31.5, near: 0.1, far: 300, position: [0, 23.5, 18.5] }}
      >
        <Suspense fallback={null}>
          {/* 地图数据位于 XY 平面，整体翻转到 XZ 地面上（+Y 朝上），便于 OrbitControls 交互 */}
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <WorldBase />
            {/* SceneReady 与 MapMesh 同在一个 Suspense 内：等 MapMesh 的贴图就绪
                且首帧画出来才通知外层。路网不在其中，所以 onReady 是「底图就绪」。 */}
            {baseGeo && (
              <>
                <MapMesh baseGeo={baseGeo} />
                <SceneReady onReady={onReady} />
              </>
            )}
          </group>
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableDamping
          dampingFactor={0.08}
          target={[0, -2.5, 0]}
          rotateSpeed={controlSpeed}
          panSpeed={controlSpeed}
          zoomSpeed={0.9}
          minDistance={10}
          maxDistance={48}
          minPolarAngle={0.3}
          maxPolarAngle={1.35}
          minAzimuthAngle={-0.9}
          maxAzimuthAngle={0.9}
          screenSpacePanning={false}
          zoomToCursor
          mouseButtons={{
            LEFT: MOUSE.PAN,
            MIDDLE: MOUSE.DOLLY,
            RIGHT: MOUSE.ROTATE,
          }}
          touches={{
            ONE: TOUCH.PAN,
            TWO: TOUCH.DOLLY_ROTATE,
          }}
        />
      </Canvas>
    </MapRoot>
  );
}
