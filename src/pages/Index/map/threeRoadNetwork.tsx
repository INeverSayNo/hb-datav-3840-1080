/**
 * 湖北省域地图的路网图层（高速 / 铁路 / 水运），从 three.tsx 拆出来做延后渲染。
 *
 * 这三层原本和底图挤在同一个同步 useMemo 里，其中高速路网有 125,504 个点，
 * 光 geoMercator() 就要调 12.5 万次 —— 必须全部算完才出第一帧。拆出来之后：
 *   - 底图（省界 + 市界 + DEM）先上屏
 *   - 路网数据（1.03MB 二进制 + 142KB JSON）在底图之后再拉、再建几何体
 *
 * 高速路网的投影已经挪到构建期（scripts/precompute-hb-map.mjs），这里只做一次
 * typed-array 展开，不再有投影开销。
 */
import { useEffect, useState } from "react";
import { geoMercator } from "d3-geo";
import {
  Color,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  Vector2,
} from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import { MAP_DEPTH } from "./threeShared";
import { HB_PROJECTION_CENTER } from "./hbProjection.generated";
import { loadHubeiRoadGeo, type HubeiRoadGeo } from "./threeResources";
import { isPointInHubei } from "@/utils/geo";

/** 高速公路线宽（屏幕像素） */
const HIGHWAY_WIDTH = 4;
/** 铁路线宽（屏幕像素） */
const RAILWAY_WIDTH = 8;
/**
 * 铁路红白色块长度（世界单位，与投影后的坐标同尺度）。
 * 按弧长而非源数据线段数切分，源数据点疏密不影响色块长度。
 * 参考换算：相机距离 10~48 对应约 198~41 px/世界单位，
 * 0.2 即最远约 8px、最近约 40px，需明显大于 RAILWAY_WIDTH 才不会被端帽糊住。
 */
const RAILWAY_DASH_LENGTH = 0.2;
/** 铁路红/白两色 */
const RAILWAY_RED = "#848484";
const RAILWAY_WHITE = "#ffffff";
/** 水运主线宽（屏幕像素） */
const WATERWAY_WIDTH = 12;
/**
 * 水运中心虚线宽（屏幕像素）。demo-line.png 实测虚线约为主线粗细的 1/5，
 * 但本图主线只有 WATERWAY_WIDTH 像素，按 1/5 会细到走样，故取约 1/3。
 */
const WATERWAY_DASH_WIDTH = 4;
/** 水运主线沿线渐变：两端 EDGE、中点 CENTER，对应 demo 的 #0074d3 → #00b0d4 → #0074d3 */
const WATERWAY_EDGE_COLOR = "#0074d3";
const WATERWAY_CENTER_COLOR = "#00b0d4";
/** 中心虚线：demo 采样 #80c8e9 = 主线色上叠 50% 白，故用白色 + 0.5 透明度 */
const WATERWAY_DASH_COLOR = "#ffffff";
const WATERWAY_DASH_OPACITY = 0.8;
/**
 * 中心虚线的实线段 / 间隔长度（世界单位）。demo 中实线段约 0.7 倍、间隔约 1.0 倍
 * 主线粗细，按默认相机距离（约 102 px/世界单位）换算得到下面两个值。
 */
const WATERWAY_DASH_LENGTH = 0.08;
const WATERWAY_GAP_LENGTH = 0.12;

/** 浮点容差：避免切点恰好落在源数据顶点上时产生零长度线段 */
const EPSILON = 1e-9;

type BuiltRoadNetwork = {
  highwayLine: LineSegments2;
  railwayLine: LineSegments2;
  waterwayLine: LineSegments2;
  waterwayDashLine: LineSegments2;
};

/**
 * 与 three.tsx 底图同一套投影：center 取构建期固化的常量，translate 归零，
 * 投影后 y 取反。铁路/水路点数少（4,605），仍在运行时投影。
 */
function createProjector() {
  const projection = geoMercator()
    .center(HB_PROJECTION_CENTER)
    .translate([0, 0]);
  return (coordinate: number[]) => {
    const [x, y] = projection(coordinate as [number, number])!;
    return new Vector2(x, -y);
  };
}

function buildRoadNetwork(geo: HubeiRoadGeo): BuiltRoadNetwork {
  const project = createProjector();
  const highwayZ = MAP_DEPTH + 0.08;
  const { lineLengths, xy } = geo.highway;
  const highwaySegmentCount = xy.length / 2 - lineLengths.length;
  const highwayPositions = new Float32Array(highwaySegmentCount * 6);
  let highwayOffset = 0;
  let pointCursor = 0;
  for (let line = 0; line < lineLengths.length; line += 1) {
    const length = lineLengths[line];
    for (let index = 1; index < length; index += 1) {
      const previous = (pointCursor + index - 1) * 2;
      const current = (pointCursor + index) * 2;
      highwayPositions[highwayOffset++] = xy[previous];
      highwayPositions[highwayOffset++] = xy[previous + 1];
      highwayPositions[highwayOffset++] = highwayZ;
      highwayPositions[highwayOffset++] = xy[current];
      highwayPositions[highwayOffset++] = xy[current + 1];
      highwayPositions[highwayOffset++] = highwayZ;
    }
    pointCursor += length;
  }

  const highwayGeometry = new LineSegmentsGeometry();
  highwayGeometry.setPositions(highwayPositions);
  const highwayMaterial = new LineMaterial({
    color: "#ffce4d",
    linewidth: HIGHWAY_WIDTH,
    worldUnits: false,
    toneMapped: false,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const highwayLine = new LineSegments2(highwayGeometry, highwayMaterial);
  highwayLine.renderOrder = 14;
  highwayLine.raycast = () => {};

  // 铁路线：沿弧长每 RAILWAY_DASH_LENGTH 切换红/白，色块严格等长。
  // 红白必须合并进同一个对象、用顶点色区分：LineMaterial 会为每段线沿线方向
  // 外扩 linewidth/2 画端帽，若拆成两个对象则后画的那色总是啃掉先画的那色，
  // 缩得越小啃得越狠（色块屏幕长度接近线宽时直接被盖没）。合并后重叠只发生在
  // 沿线相邻色块之间，红白对称各让一半，任何缩放下都保持 50/50。
  const railwayPositions: number[] = [];
  const railwayColors: number[] = [];
  const railwayZ = MAP_DEPTH + 0.085;
  const railwayRedColor = new Color(RAILWAY_RED);
  const railwayWhiteColor = new Color(RAILWAY_WHITE);

  geo.railway.coordinates.forEach((coordinates) => {
    if (coordinates.length < 2) return;
    let previous = project(coordinates[0]);
    // 每条折线独立从红色色块起始
    let isRed = true;
    let dashRemaining = RAILWAY_DASH_LENGTH;

    for (let index = 1; index < coordinates.length; index += 1) {
      if(!isPointInHubei(coordinates[index][0], coordinates[index][1])) {
        continue
      }
      const current = project(coordinates[index]);
      const segmentLength = previous.distanceTo(current);
      if (segmentLength <= EPSILON) {
        previous = current;
        continue;
      }

      // 在当前源线段内部按剩余色块长度反复切分
      let consumed = 0;
      while (consumed < segmentLength - EPSILON) {
        const step = Math.min(dashRemaining, segmentLength - consumed);
        const startRatio = consumed / segmentLength;
        const endRatio = (consumed + step) / segmentLength;
        railwayPositions.push(
          previous.x + (current.x - previous.x) * startRatio,
          previous.y + (current.y - previous.y) * startRatio,
          railwayZ,
          previous.x + (current.x - previous.x) * endRatio,
          previous.y + (current.y - previous.y) * endRatio,
          railwayZ,
        );
        const color = isRed ? railwayRedColor : railwayWhiteColor;
        // 一段线的首尾各一个颜色，保持纯色不渐变
        railwayColors.push(color.r, color.g, color.b, color.r, color.g, color.b);

        consumed += step;
        dashRemaining -= step;
        if (dashRemaining <= EPSILON) {
          dashRemaining = RAILWAY_DASH_LENGTH;
          isRed = !isRed;
        }
      }

      previous = current;
    }
  });

  const railwayGeometry = new LineSegmentsGeometry();
  railwayGeometry.setPositions(railwayPositions);
  railwayGeometry.setColors(railwayColors);
  const railwayMaterial = new LineMaterial({
    vertexColors: true,
    linewidth: RAILWAY_WIDTH,
    worldUnits: false,
    toneMapped: false,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const railwayLine = new LineSegments2(railwayGeometry, railwayMaterial);
  railwayLine.renderOrder = 15;
  railwayLine.raycast = () => {};

  // 水运线：主线沿线做 #0074d3 → #00b0d4 → #0074d3 渐变，中心叠一条半透明白虚线。
  // 这里不需要像铁路那样重采样切段：渐变按累计弧长归一化取色、由顶点色插值得到，
  // 虚线交给 LineMaterial 的 USE_DASH 分支在片元里按 instanceDistance 裁切，
  // 两者都只跟弧长有关，源数据分段长短完全不影响观感。
  const waterwayPositions: number[] = [];
  const waterwayColors: number[] = [];
  /** 每段起止的累计弧长，供虚线着色器裁切使用 */
  const waterwayDistances: number[] = [];
  const waterwayZ = MAP_DEPTH + 0.09;
  const waterwayEdgeColor = new Color(WATERWAY_EDGE_COLOR);
  const waterwayCenterColor = new Color(WATERWAY_CENTER_COLOR);
  const waterwayGradientColor = new Color();

  /** 取归一化位置 t∈[0,1] 处的渐变色写入颜色缓冲（t=0.5 最亮，两端最暗） */
  const pushWaterwayColor = (t: number) => {
    waterwayGradientColor
      .copy(waterwayEdgeColor)
      .lerp(waterwayCenterColor, 1 - Math.abs(t * 2 - 1));
    waterwayColors.push(
      waterwayGradientColor.r,
      waterwayGradientColor.g,
      waterwayGradientColor.b,
    );
  };

  geo.waterway.coordinates.forEach((coordinates) => {
    if (coordinates.length < 2) return;
    
    const points = coordinates.filter(e=>isPointInHubei(e[0], e[1])).map(project);

    // 先量出整条线的累计弧长，渐变才能按长度而非顶点序号归一化
    const cumulative = [0];
    for (let index = 1; index < points.length; index += 1) {
      cumulative.push(
        cumulative[index - 1] + points[index - 1].distanceTo(points[index]),
      );
    }
    const total = cumulative[points.length - 1];
    if (total <= EPSILON) return;

    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      waterwayPositions.push(
        previous.x,
        previous.y,
        waterwayZ,
        current.x,
        current.y,
        waterwayZ,
      );
      pushWaterwayColor(cumulative[index - 1] / total);
      pushWaterwayColor(cumulative[index] / total);
      // 每条线独立从 0 起算，保证都从实线段开头
      waterwayDistances.push(cumulative[index - 1], cumulative[index]);
    }
  });

  const waterwayGeometry = new LineSegmentsGeometry();
  waterwayGeometry.setPositions(waterwayPositions);
  waterwayGeometry.setColors(waterwayColors);
  const waterwayMaterial = new LineMaterial({
    vertexColors: true,
    linewidth: WATERWAY_WIDTH,
    worldUnits: false,
    toneMapped: false,
    transparent: true,
    // 主线不透明，渐变才等于给定的 #0074d3/#00b0d4；虚线的 50% 白叠上去
    // 正好还原 demo 采样到的 #80c8e9。transparent 仍保留以走 renderOrder 排序。
    opacity: 1,
    depthWrite: false,
  });
  const waterwayLine = new LineSegments2(waterwayGeometry, waterwayMaterial);
  waterwayLine.renderOrder = 17;
  waterwayLine.raycast = () => {};

  // 中心虚线与主线共用顶点，只是额外挂上累计弧长属性（LineSegments2.computeLineDistances
  // 会把 53 条线首尾串成一条连续距离，这里改为手写以保证每条线各自从 0 开始）。
  const waterwayDashGeometry = new LineSegmentsGeometry();
  waterwayDashGeometry.setPositions(waterwayPositions);
  const waterwayDistanceBuffer = new InstancedInterleavedBuffer(
    new Float32Array(waterwayDistances),
    2,
    1,
  );
  waterwayDashGeometry.setAttribute(
    "instanceDistanceStart",
    new InterleavedBufferAttribute(waterwayDistanceBuffer, 1, 0),
  );
  waterwayDashGeometry.setAttribute(
    "instanceDistanceEnd",
    new InterleavedBufferAttribute(waterwayDistanceBuffer, 1, 1),
  );
  const waterwayDashMaterial = new LineMaterial({
    color: WATERWAY_DASH_COLOR,
    linewidth: WATERWAY_DASH_WIDTH,
    dashed: true,
    dashSize: WATERWAY_DASH_LENGTH,
    gapSize: WATERWAY_GAP_LENGTH,
    worldUnits: false,
    toneMapped: false,
    transparent: true,
    opacity: WATERWAY_DASH_OPACITY,
    depthWrite: false,
  });
  const waterwayDashLine = new LineSegments2(
    waterwayDashGeometry,
    waterwayDashMaterial,
  );
  waterwayDashLine.renderOrder = 18;
  waterwayDashLine.raycast = () => {};

  return { highwayLine, railwayLine, waterwayLine, waterwayDashLine };
}

function disposeRoadNetwork(built: BuiltRoadNetwork) {
  for (const line of Object.values(built)) {
    line.geometry.dispose();
    line.material.dispose();
  }
}

/**
 * 路网图层。数据加载与几何体构建都放在 effect 里、结果存 state：
 * 若像底图那样在 useMemo 里 new 出来，StrictMode 的双调用会让第一批对象
 * 拿不到 dispose（cleanup 只看得见 commit 的那批）而泄漏显存。
 */
export default function RoadNetwork() {
  const [built, setBuilt] = useState<BuiltRoadNetwork | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: BuiltRoadNetwork | null = null;

    void loadHubeiRoadGeo()
      .then((geo) => {
        if (cancelled) return;
        created = buildRoadNetwork(geo);
        setBuilt(created);
      })
      .catch((error: unknown) => {
        console.error("[hb-map] 路网图层加载失败", error);
      });

    return () => {
      cancelled = true;
      if (created) {
        disposeRoadNetwork(created);
        created = null;
      }
    };
  }, []);

  if (!built) return null;

  return (
    <>
      <primitive object={built.highwayLine} />
      <primitive object={built.railwayLine} />
      <primitive object={built.waterwayLine} />
      <primitive object={built.waterwayDashLine} />
    </>
  );
}
