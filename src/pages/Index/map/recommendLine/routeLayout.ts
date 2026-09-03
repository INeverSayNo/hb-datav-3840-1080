import { Box2, Vector2 } from "three";

import type {
  InsetRecommendMapId,
  OutRecommendMapId,
  RecommendRoute,
} from "../../recommendLineRoutes";
import {
  MAP_COLLISION_GAP,
  MAP_INSET_FRAME_PADDING,
  MAP_INSET_LAYOUT_MARGIN,
  MAP_STAGE_HEIGHT,
  MAP_STAGE_WIDTH,
  TARGET_MAP_HEIGHT,
  TARGET_MAP_WIDTH,
  WORLD_TARGET_MAP_HEIGHT,
  WORLD_TARGET_MAP_WIDTH,
} from "./constants";
import { getProjectedMapRegion } from "./buildRegion";
import {
  avoidOutCollisions,
  clampRect,
  defaultInsetPlacement,
  defaultOutPlacement,
  fitPlacementRect,
  getAutomaticMainRect,
  rectanglesOverlap,
  type PixelRect,
} from "./layout";
import { getProjection } from "./projection";
import { isInsetKind } from "./sources";
import type { MapRegionId, ProjectedMapRegion, ProjectedRouteLayout } from "./types";

const routeLayoutCache = new Map<string, ProjectedRouteLayout>();

/** placementTransform 需要的共享布局量。 */
type PlacementContext = {
  center: Vector2;
  fitScale: number;
  targetHeight: number;
  targetWidth: number;
};

/**
 * 把一个 MapStage 像素矩形换算成区域 group 的 position/scale。
 * out 与 inset 两条路径共用，保证角落小图的落位数学完全一致。
 */
function placementTransform(
  region: ProjectedMapRegion,
  rect: PixelRect,
  ctx: PlacementContext,
) {
  const size = region.bbox.getSize(new Vector2());
  const desiredWorldWidth = (rect.width / MAP_STAGE_WIDTH) * ctx.targetWidth;
  const desiredWorldHeight = (rect.height / MAP_STAGE_HEIGHT) * ctx.targetHeight;
  /** 相对最终世界坐标的实缩放（= fitScale × localScale）。 */
  const effectiveScale = Math.min(
    desiredWorldWidth / Math.max(size.x, 0.001),
    desiredWorldHeight / Math.max(size.y, 0.001),
  );
  const localScale = effectiveScale / ctx.fitScale;
  const pixelCenter = new Vector2(
    rect.x + rect.width / 2,
    rect.y + rect.height / 2,
  );
  const desiredWorldCenter = new Vector2(
    (pixelCenter.x / MAP_STAGE_WIDTH - 0.5) * ctx.targetWidth,
    (0.5 - pixelCenter.y / MAP_STAGE_HEIGHT) * ctx.targetHeight,
  );
  const rawCenter = region.bbox.getCenter(new Vector2());
  return {
    effectiveScale,
    transform: {
      position: [
        ctx.center.x + desiredWorldCenter.x / ctx.fitScale - rawCenter.x * localScale,
        ctx.center.y + desiredWorldCenter.y / ctx.fitScale - rawCenter.y * localScale,
        0,
      ] as [number, number, 0],
      scale: localScale,
    },
  };
}

export function getRouteLayout(route: RecommendRoute): ProjectedRouteLayout {
  const cached = routeLayoutCache.get(route.mapKey);
  if (cached) return cached;

  const regions = route.mapIds.map(getProjectedMapRegion);
  const viewMode = route.mapIds.some((id) => id.startsWith("out-"))
    ? "world"
    : "regional";

  // mainGroup 中的地图共享主体投影和变换；未配置时保持“国内主体 + 独立 out”的默认行为。
  const mainMapIdSet = route.mainMapIds
    ? new Set<MapRegionId>(route.mainMapIds)
    : undefined;
  // 嵌图是第三类：既不进主体包围盒，也不进 out 的碰撞占位，
  // 所以下面两个 filter 都要把它排除掉。
  const insetRegions = regions.filter((region) => isInsetKind(region.kind));
  const mainRegions = regions.filter(
    (region) =>
      !isInsetKind(region.kind) &&
      (region.kind !== "out" || mainMapIdSet?.has(region.id) === true),
  );
  const outRegions = regions.filter(
    (region) => !isInsetKind(region.kind) && !mainRegions.includes(region),
  );
  const baseRegions =
    mainRegions.length > 0
      ? mainRegions
      : regions.filter((region) => !isInsetKind(region.kind));

  const occupiedOutRects: PixelRect[] = [];
  const outRectById = new Map<MapRegionId, PixelRect>();
  outRegions.forEach((region, index) => {
    const placement =
      route.outPlacements?.[region.id as OutRecommendMapId] ??
      defaultOutPlacement(index, outRegions.length);
    const rect = avoidOutCollisions(
      fitPlacementRect(region, placement),
      occupiedOutRects,
    );
    occupiedOutRects.push(rect);
    outRectById.set(region.id, rect);
  });

  const bounds = new Box2();
  baseRegions.forEach(({ bbox }) => bounds.union(bbox));
  const size = bounds.getSize(new Vector2());
  const automaticMainRect = getAutomaticMainRect(occupiedOutRects);
  const requestedMainRect = route.mainPlacement
    ? clampRect({
        width: route.mainPlacement.sizePx?.[0] ?? automaticMainRect.width,
        height: route.mainPlacement.sizePx?.[1] ?? automaticMainRect.height,
        x:
          (route.mainPlacement.positionPx?.[0] ??
            automaticMainRect.x + automaticMainRect.width / 2) -
          (route.mainPlacement.sizePx?.[0] ?? automaticMainRect.width) / 2,
        y:
          (route.mainPlacement.positionPx?.[1] ??
            automaticMainRect.y + automaticMainRect.height / 2) -
          (route.mainPlacement.sizePx?.[1] ?? automaticMainRect.height) / 2,
      })
    : automaticMainRect;
  const mainRect = occupiedOutRects.some((outRect) =>
    rectanglesOverlap(requestedMainRect, outRect, MAP_COLLISION_GAP),
  )
    ? automaticMainRect
    : requestedMainRect;
  const targetWidth =
    viewMode === "world" ? WORLD_TARGET_MAP_WIDTH : TARGET_MAP_WIDTH;
  const targetHeight =
    viewMode === "world" ? WORLD_TARGET_MAP_HEIGHT : TARGET_MAP_HEIGHT;
  const fitScale = Math.min(
    ((mainRect.width / MAP_STAGE_WIDTH) * targetWidth) /
      Math.max(size.x, 0.001),
    ((mainRect.height / MAP_STAGE_HEIGHT) * targetHeight) /
      Math.max(size.y, 0.001),
  );
  const mainPixelCenter = new Vector2(
    mainRect.x + mainRect.width / 2,
    mainRect.y + mainRect.height / 2,
  );
  const mainWorldCenter = new Vector2(
    (mainPixelCenter.x / MAP_STAGE_WIDTH - 0.5) * targetWidth,
    (0.5 - mainPixelCenter.y / MAP_STAGE_HEIGHT) * targetHeight,
  );
  const center = bounds
    .getCenter(new Vector2())
    .sub(mainWorldCenter.clone().divideScalar(fitScale));

  const transformById = new Map<
    MapRegionId,
    NonNullable<ProjectedMapRegion["transform"]>
  >();
  const ctx: PlacementContext = { center, fitScale, targetHeight, targetWidth };
  outRegions.forEach((region) => {
    const rect = outRectById.get(region.id)!;
    transformById.set(region.id, placementTransform(region, rect, ctx).transform);
  });

  // 嵌图：与 out 共用落位数学，但刻意不做 avoidOutCollisions、也不写进
  // occupiedOutRects —— 南海诸岛固定在角落，不应该反过来挤压主体地图。
  const insetFrameById = new Map<
    MapRegionId,
    NonNullable<ProjectedMapRegion["insetFrame"]>
  >();
  insetRegions.forEach((region) => {
    const placement =
      route.insetPlacements?.[region.id as InsetRecommendMapId] ??
      defaultInsetPlacement();
    const rect = fitPlacementRect(region, placement, MAP_INSET_LAYOUT_MARGIN);
    const { effectiveScale, transform } = placementTransform(region, rect, ctx);
    transformById.set(region.id, transform);

    // 留白按 effectiveScale 折算回局部单位，边框的屏幕留白才不随嵌图缩放变化。
    const padX =
      (MAP_INSET_FRAME_PADDING * targetWidth) /
      (MAP_STAGE_WIDTH * effectiveScale);
    const padY =
      (MAP_INSET_FRAME_PADDING * targetHeight) /
      (MAP_STAGE_HEIGHT * effectiveScale);
    insetFrameById.set(region.id, {
      min: [region.bbox.min.x - padX, region.bbox.min.y - padY],
      max: [region.bbox.max.x + padX, region.bbox.max.y + padY],
    });
  });

  mainRegions.forEach((region) => {
    const adjustment = route.visualAdjustments?.[region.id];
    if (!adjustment) return;

    const visualScale = adjustment.scale ?? 1;
    const offsetPx = adjustment.offsetPx ?? [0, 0];
    const localOffset = new Vector2(
      ((offsetPx[0] / MAP_STAGE_WIDTH) * targetWidth) / fitScale,
      (-(offsetPx[1] / MAP_STAGE_HEIGHT) * targetHeight) / fitScale,
    );
    const rawCenter = region.bbox.getCenter(new Vector2());
    transformById.set(region.id, {
      position: [
        rawCenter.x * (1 - visualScale) + localOffset.x,
        rawCenter.y * (1 - visualScale) + localOffset.y,
        0,
      ],
      scale: visualScale,
    });
  });

  // 边界线段：out 区域按同样变换烘焙坐标，与网格组的 transform 保持一致。
  // 嵌图整体跳过——它的岛礁轮廓和十段线在自己的 group 内局部渲染，
  // 线宽要单独调（112 个亚像素小环套上中国边界那圈 5px 光晕会糊成一团）。
  const boundarySegments: [number, number, number][] = [];
  const chinaBoundarySegments: [number, number, number][] = [];
  regions.forEach((region) => {
    if (isInsetKind(region.kind)) return;
    const transform = transformById.get(region.id);
    region.boundarySegments.forEach(([x, y, z]) => {
      const target =
        region.kind === "china" ? chinaBoundarySegments : boundarySegments;
      if (!transform) {
        target.push([x, y, z]);
        return;
      }
      target.push([
        x * transform.scale + transform.position[0],
        y * transform.scale + transform.position[1],
        z * transform.scale,
      ]);
    });
  });

  const layout: ProjectedRouteLayout = {
    boundarySegments,
    chinaBoundarySegments,
    center,
    fitScale,
    mapKey: route.mapKey,
    regions: regions.map((region) => ({
      ...region,
      insetFrame: insetFrameById.get(region.id),
      transform: transformById.get(region.id),
    })),
    viewMode,
  };
  routeLayoutCache.set(route.mapKey, layout);
  return layout;
}

/**
 * 将经纬度烘焙到中心组（position=[-center.x, -center.y]）局部坐标。
 * 优先选择包含该点的最小 bbox region 并应用其 transform，与 boundarySegments 的烘焙方式一致。
 */
/**
 * 查找包含指定经纬度的最小 bbox 区域。
 * 海面/无区域覆盖处返回 undefined，调用方按 scale=1 处理。
 */
function findRegionAt(
  layout: ProjectedRouteLayout,
  lng: number,
  lat: number,
): ProjectedMapRegion | undefined {
  const projection = getProjection();
  const [x, y] = projection([lng, lat])!;
  const point = new Vector2(x, -y);

  let bestRegion: ProjectedMapRegion | undefined;
  let bestArea = Infinity;
  layout.regions.forEach((region) => {
    // 嵌图不参与 POI 命中。南海诸岛的 bbox 覆盖 lng 108.3–123.0 / lat 3.55–24.75，
    // 赶肉下江有三个开阔海面航路点（[111.35,20.35]、[115.5,21]、[119.28,24.07]）
    // 落在其中且没有任何省份包含它们，不排除就会被 bakePoiPoint 搬进右下角小框。
    if (isInsetKind(region.kind)) return;
    if (!region.bbox.containsPoint(point)) return;
    const size = region.bbox.getSize(new Vector2());
    const area = size.x * size.y;
    if (area < bestArea) {
      bestArea = area;
      bestRegion = region;
    }
  });
  return bestRegion;
}

/** 返回指定经纬度所属的布局区域 id。 */
export function getRegionIdAt(
  layout: ProjectedRouteLayout,
  lng: number,
  lat: number,
): MapRegionId | undefined {
  return findRegionAt(layout, lng, lat)?.id;
}

/**
 * 将经纬度烘焙到中心组（position=[-center.x, -center.y]）局部坐标。
 * 优先选择包含该点的最小 bbox region 并应用其 transform，与 boundarySegments 的烘焙方式一致。
 */
export function bakePoiPoint(
  layout: ProjectedRouteLayout,
  lng: number,
  lat: number,
): [number, number] {
  const projection = getProjection();
  const [x, y] = projection([lng, lat])!;
  const point = new Vector2(x, -y);

  const transform = findRegionAt(layout, lng, lat)?.transform;
  if (!transform) return [point.x, point.y];
  return [
    point.x * transform.scale + transform.position[0],
    point.y * transform.scale + transform.position[1],
  ];
}

/**
 * 该经纬度所在区域的缩放比例（海面/无区域处按 1）。
 * 区域 group 的 scale 会放大挤出体厚度（顶面 = MAP_DEPTH × scale），
 * 飞线高度必须 ≥ 途经区域最大 scale 对应的顶面高度，才不会被遮盖。
 */
export function getRegionScaleAt(
  layout: ProjectedRouteLayout,
  lng: number,
  lat: number,
): number {
  return findRegionAt(layout, lng, lat)?.transform?.scale ?? 1;
}
