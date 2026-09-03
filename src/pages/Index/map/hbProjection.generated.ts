// 该文件由 scripts/precompute-hb-map.mjs 生成，请勿手动修改。
// 修改 src/assets 下的 hb.json / hb_outline.json / hb-railway.json /
// hb-waterway.json 之后需重新生成。
//
// bbox 依据 13,403 个坐标点算出，来源与运行时
// 完全一致：省界轮廓 + 市界 + 铁路 + 水路（高速路网走裸 projection，不参与）。
// 固化成常量是为了让路网/铁路/水路可以延后加载而不改变 DEM 贴图的 UV。

/** geoMercator 的中心经纬度，取自 hb_outline 的 properties.centroid。 */
export const HB_PROJECTION_CENTER: [number, number] = [112.271301, 30.987527];

/** 投影后（y 已取反）的包围盒，供 ShapeBox 归一化 DEM 贴图 UV。 */
export const HB_MAP_BBOX = {
  minX: -10.422410713888894,
  minY: -6.03648417072246,
  maxX: 10.71800779243614,
  maxY: 7.213561246902685,
} as const;

/** hb-highway.bin 的段数，用于预分配 LineSegmentsGeometry 的位置缓冲。 */
export const HB_HIGHWAY_SEGMENT_COUNT = 107146;
