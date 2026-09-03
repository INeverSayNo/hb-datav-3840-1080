/**
 * 预计算共享墨卡托投影的 center / scale。
 *
 * 运行时原本的 getProjection() 要对全部 30 个省的 GeoJSON 做两趟全量坐标遍历
 * （约 11.2 万次 new Vector2）才能算出这两个值，而且因为需要「所有省份都在场」，
 * 直接堵死了按需加载。这里把它挪到构建期。
 *
 * ⚠️ 任何改动省份 GeoJSON 的操作（如 optimize-geojson.mjs）之后都必须重跑本脚本。
 *
 * 用法: node scripts/precompute-projection.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { geoMercator } from "d3-geo";

const GEO_DIR = "src/assets/recommendLine";
const ROUTES_FILE = "src/pages/Index/recommendLineRoutes.ts";
const OUT_FILE = "src/pages/Index/map/recommendLine/projection.generated.ts";

/** 必须与 RecommendLineMap 的 GLOBAL_MAP_WIDTH 一致。 */
const GLOBAL_MAP_WIDTH = 27;

// ---- 取得省份 id 列表（与运行时同一个来源） ----
const routesSrc = fs.readFileSync(ROUTES_FILE, "utf8");
const idsBlock = routesSrc.match(
  /export const ALL_RECOMMEND_PROVINCE_IDS = \[([\s\S]*?)\] as const;/,
);
if (!idsBlock) throw new Error(`无法从 ${ROUTES_FILE} 解析 ALL_RECOMMEND_PROVINCE_IDS`);
// 列表里有被注释掉的省份（如 hainan），运行时不含它们，这里也必须剔除。
const provinceIds = [
  ...idsBlock[1]
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .matchAll(/"([^"]+)"/g),
].map((m) => m[1]);

// ---- id -> 文件（大小写不敏感，对应 shaanxi / Shaanxi.json） ----
const byLowerName = new Map(
  fs
    .readdirSync(GEO_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [path.basename(f, ".json").toLowerCase(), f]),
);

const files = provinceIds.map((id) => {
  const file = byLowerName.get(id.toLowerCase());
  if (!file) throw new Error(`省份 "${id}" 找不到对应的 GeoJSON 文件`);
  return path.join(GEO_DIR, file);
});

// ---- 遍历坐标 ----
const featuresOf = (j) => (j.type === "FeatureCollection" ? j.features : [j]);
const polygonsOf = (g) =>
  g.type === "Polygon" ? [g.coordinates] : g.coordinates;

const datasets = files.map((f) => JSON.parse(fs.readFileSync(f, "utf8")));

function forEachCoordinate(callback) {
  for (const data of datasets) {
    for (const feature of featuresOf(data)) {
      for (const polygon of polygonsOf(feature.geometry)) {
        for (const ring of polygon) for (const c of ring) callback(c);
      }
    }
  }
}

// ---- 复刻 getProjection() 的两趟计算 ----
let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
let count = 0;
forEachCoordinate(([lon, lat]) => {
  if (lon < minLon) minLon = lon;
  if (lon > maxLon) maxLon = lon;
  if (lat < minLat) minLat = lat;
  if (lat > maxLat) maxLat = lat;
  count += 1;
});

const center = [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
const projection = geoMercator().center(center).translate([0, 0]);

let minX = Infinity, maxX = -Infinity;
forEachCoordinate((c) => {
  const x = projection(c)[0];
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
});

const scale = projection.scale() * (GLOBAL_MAP_WIDTH / (maxX - minX));

// ---- 自校验：用常量重建投影，包围盒宽度必须回到 GLOBAL_MAP_WIDTH ----
const verify = geoMercator().center(center).translate([0, 0]).scale(scale);
let vMinX = Infinity, vMaxX = -Infinity, vMinY = Infinity, vMaxY = -Infinity;
forEachCoordinate((c) => {
  const [x, y] = verify(c);
  if (x < vMinX) vMinX = x;
  if (x > vMaxX) vMaxX = x;
  if (-y < vMinY) vMinY = -y;
  if (-y > vMaxY) vMaxY = -y;
});

const width = vMaxX - vMinX;
const drift = Math.abs(width - GLOBAL_MAP_WIDTH);
if (!(drift < 1e-9)) {
  console.error(
    `✗ 校验失败：常量投影后宽度 ${width}，期望 ${GLOBAL_MAP_WIDTH}（偏差 ${drift}）`,
  );
  process.exit(1);
}

// ---- 输出 ----
const contents = `// 该文件由 scripts/precompute-projection.mjs 生成，请勿手动修改。
// 修改 src/assets/recommendLine 下的省份 GeoJSON 后需重新生成。
//
// 依据 ${provinceIds.length} 个省份、${count.toLocaleString("en-US")} 个坐标点计算，
// 用于替代运行时对全部省份数据的两趟遍历（这也是按需加载的前置条件）。

/** geoMercator 的中心经纬度。 */
export const PROJECTION_CENTER: [number, number] = [${center[0]}, ${center[1]}];

/** 使投影后包围盒宽度恰为 GLOBAL_MAP_WIDTH(${GLOBAL_MAP_WIDTH}) 的缩放值。 */
export const PROJECTION_SCALE = ${scale};
`;

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, contents);

console.log(`省份 ${provinceIds.length} 个，坐标 ${count.toLocaleString("en-US")} 个`);
console.log(`center = [${center[0]}, ${center[1]}]`);
console.log(`scale  = ${scale}`);
console.log(`✓ 校验通过：宽度 ${width.toFixed(12)}（偏差 ${drift.toExponential(2)}）`);
console.log(`已写入 ${OUT_FILE}`);
