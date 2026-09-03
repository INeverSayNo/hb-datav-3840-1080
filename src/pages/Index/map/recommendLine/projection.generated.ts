// 该文件由 scripts/precompute-projection.mjs 生成，请勿手动修改。
// 修改 src/assets/recommendLine 下的省份 GeoJSON 后需重新生成。
//
// 依据 30 个省份、56,068 个坐标点计算，
// 用于替代运行时对全部省份数据的两趟遍历（这也是按需加载的前置条件）。

/** geoMercator 的中心经纬度。 */
export const PROJECTION_CENTER: [number, number] = [104.30055000000002, 36.88765];

/** 使投影后包围盒宽度恰为 GLOBAL_MAP_WIDTH(27) 的缩放值。 */
export const PROJECTION_SCALE = 25.11826224308303;
