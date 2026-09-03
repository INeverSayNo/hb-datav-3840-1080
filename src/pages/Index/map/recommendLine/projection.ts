import { geoMercator } from "d3-geo";

import { PROJECTION_CENTER, PROJECTION_SCALE } from "./projection.generated";

let projectionCache: ReturnType<typeof geoMercator> | undefined;

export function getProjection() {
  if (projectionCache) return projectionCache;

  // 常量由 scripts/precompute-projection.mjs 预计算。原实现要对全部 30 个省的
  // GeoJSON 做两趟全量坐标遍历（约 11.2 万次 new Vector2），且因为要求「所有
  // 省份都在场」而堵死了按需加载。
  projectionCache = geoMercator()
    .center(PROJECTION_CENTER)
    .translate([0, 0])
    .scale(PROJECTION_SCALE);
  return projectionCache;
}
