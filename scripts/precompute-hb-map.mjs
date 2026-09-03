/**
 * 预计算湖北省域地图（map/three.tsx）的投影常量与高速路网二进制。
 *
 * 解决两件事：
 *
 * 1. **bbox 常量化**。DEM 贴图的 UV 是按 bbox 归一化的（map/shape.tsx），而运行时
 *    的 bbox 由省界轮廓 + 市界 + 铁路 + 水路四份数据在投影时累积撑出来。一旦把
 *    路网/铁路/水路改成延后加载，bbox 就会先小后大 —— DEM 贴图会可见地跳一下。
 *    把最终 bbox 固化成常量后，无论延后哪些图层，UV 都不变。
 *
 * 2. **高速路网二进制化**。hb-highway.json 2.6MB / 125,504 个点，原本被 Vite 内联
 *    进 three chunk（整段当 JS 字面量解析），运行时还要做 12.5 万次 geoMercator()
 *    调用。这里把投影挪到构建期，存成 Float32 二进制：体积降到约 1.0MB，运行时只剩
 *    一次 typed-array 展开循环。
 *
 * ⚠️ 修改 src/assets 下的 hb.json / hb_outline.json / hb-railway.json /
 *    hb-waterway.json / hb-highway.json 之后，必须重跑本脚本。
 *    （开发模式下 threeResources.ts 会重算 bbox 并在不一致时告警兜底。）
 *
 * 用法: node scripts/precompute-hb-map.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { geoMercator } from "d3-geo";

const ASSETS = "src/assets";
const OUT_TS = "src/pages/Index/map/hbProjection.generated.ts";
const OUT_BIN = path.join(ASSETS, "hb-highway.bin");

/** 必须与 three.tsx 里 MAP_DEPTH + 0.08 的路网抬升一致（z 不入文件，展开时写入）。 */
const MAGIC = "HBHW";
const VERSION = 1;

const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(ASSETS, `${name}.json`), "utf8"));

const outline = read("hb_outline");
const cities = read("hb");
const railway = read("hb-railway");
const waterway = read("hb-waterway");
const highway = read("hb-highway");

// ---- 复刻 three.tsx:316-318 的投影 ----
const center = outline.features[0].properties.centroid;
const projection = geoMercator().center(center).translate([0, 0]);

/** three.tsx 的 project()：投影后取 (x, -y)。 */
const project = (coordinate) => {
  const [x, y] = projection(coordinate);
  return [x, -y];
};

// ---- 复刻撑大 bbox 的四个来源 ----
// three.tsx 里调用 project()（会 expandByPoint）的位置：
//   331 省界轮廓环、348 市界环、426+432 铁路、520 水路
// 高速路网走的是裸 projection()，不参与 bbox；铁路/水路的虚线切分点是算术插值
// 出来的，也不参与。
function eachBboxCoordinate(callback) {
  for (const source of [outline, cities]) {
    for (const feature of source.features) {
      // 两份数据都是 MultiPolygon
      for (const polygon of feature.geometry.coordinates) {
        for (const ring of polygon) for (const c of ring) callback(c);
      }
    }
  }
  for (const source of [railway, waterway]) {
    for (const line of source.coordinates) {
      // 运行时对 length < 2 的线直接 return，一个点都不投影
      if (line.length < 2) continue;
      for (const c of line) callback(c);
    }
  }
}

let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
let bboxPointCount = 0;
eachBboxCoordinate((c) => {
  const [x, y] = project(c);
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
  bboxPointCount += 1;
});

// ---- 自校验 1：十进制字面量往返必须无损 ----
// 常量是以十进制字符串写进 .ts 的，解析回来必须是同一个 double，否则 UV 会有
// 亚像素偏移。用 JS 默认的最短往返表示即可保证，这里显式断言。
for (const [name, value] of [
  ["minX", minX],
  ["minY", minY],
  ["maxX", maxX],
  ["maxY", maxY],
  ["center[0]", center[0]],
  ["center[1]", center[1]],
]) {
  if (Number(String(value)) !== value) {
    console.error(`✗ ${name} 的十进制往返有损: ${value} -> ${String(value)}`);
    process.exit(1);
  }
}

// ---- 高速路网 -> Float32 二进制 ----
// 运行时 three.tsx:380 会跳过 length < 2 的线，这里同样剔除，
// 好让 segmentCount = pointCount - lineCount 这个推导成立。
const lines = highway.coordinates.filter((line) => line.length >= 2);
const skipped = highway.coordinates.length - lines.length;
const lineCount = lines.length;
const pointCount = lines.reduce((total, line) => total + line.length, 0);
const segmentCount = pointCount - lineCount;

const headerBytes = 16;
const indexBytes = lineCount * 4;
const buffer = Buffer.alloc(headerBytes + indexBytes + pointCount * 2 * 4);

buffer.write(MAGIC, 0, "ascii");
buffer.writeUInt32LE(VERSION, 4);
buffer.writeUInt32LE(lineCount, 8);
buffer.writeUInt32LE(pointCount, 12);

let indexOffset = headerBytes;
let xyOffset = headerBytes + indexBytes;
for (const line of lines) {
  buffer.writeUInt32LE(line.length, indexOffset);
  indexOffset += 4;
  for (const coordinate of line) {
    const [x, y] = project(coordinate);
    buffer.writeFloatLE(Math.fround(x), xyOffset);
    buffer.writeFloatLE(Math.fround(y), xyOffset + 4);
    xyOffset += 8;
  }
}

fs.writeFileSync(OUT_BIN, buffer);

// ---- 自校验 2：读回二进制，抽查点与现场投影逐位一致 ----
{
  const raw = fs.readFileSync(OUT_BIN);
  const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const view = new DataView(ab);
  if (Buffer.from(ab, 0, 4).toString("ascii", 0, 4) !== MAGIC) {
    console.error("✗ magic 校验失败");
    process.exit(1);
  }
  const vLineCount = view.getUint32(8, true);
  const vPointCount = view.getUint32(12, true);
  if (vLineCount !== lineCount || vPointCount !== pointCount) {
    console.error(
      `✗ 头部校验失败: lineCount ${vLineCount}/${lineCount}, pointCount ${vPointCount}/${pointCount}`,
    );
    process.exit(1);
  }
  const lengths = new Uint32Array(ab, headerBytes, vLineCount);
  const xy = new Float32Array(ab, headerBytes + indexBytes, vPointCount * 2);

  // 逐点全量比对（12.5 万点，构建期跑一次不心疼），比抽查更靠得住
  let cursor = 0;
  for (let l = 0; l < lineCount; l += 1) {
    if (lengths[l] !== lines[l].length) {
      console.error(`✗ 第 ${l} 条线长度不符: ${lengths[l]}/${lines[l].length}`);
      process.exit(1);
    }
    for (const coordinate of lines[l]) {
      const [x, y] = project(coordinate);
      if (
        xy[cursor * 2] !== Math.fround(x) ||
        xy[cursor * 2 + 1] !== Math.fround(y)
      ) {
        console.error(`✗ 第 ${cursor} 个点回读不一致`);
        process.exit(1);
      }
      cursor += 1;
    }
  }
}

// ---- 输出常量 ----
const contents = `// 该文件由 scripts/precompute-hb-map.mjs 生成，请勿手动修改。
// 修改 src/assets 下的 hb.json / hb_outline.json / hb-railway.json /
// hb-waterway.json 之后需重新生成。
//
// bbox 依据 ${bboxPointCount.toLocaleString("en-US")} 个坐标点算出，来源与运行时
// 完全一致：省界轮廓 + 市界 + 铁路 + 水路（高速路网走裸 projection，不参与）。
// 固化成常量是为了让路网/铁路/水路可以延后加载而不改变 DEM 贴图的 UV。

/** geoMercator 的中心经纬度，取自 hb_outline 的 properties.centroid。 */
export const HB_PROJECTION_CENTER: [number, number] = [${center[0]}, ${center[1]}];

/** 投影后（y 已取反）的包围盒，供 ShapeBox 归一化 DEM 贴图 UV。 */
export const HB_MAP_BBOX = {
  minX: ${minX},
  minY: ${minY},
  maxX: ${maxX},
  maxY: ${maxY},
} as const;

/** hb-highway.bin 的段数，用于预分配 LineSegmentsGeometry 的位置缓冲。 */
export const HB_HIGHWAY_SEGMENT_COUNT = ${segmentCount};
`;

fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
fs.writeFileSync(OUT_TS, contents);

const mb = (n) => (n / 1024 / 1024).toFixed(2) + "MB";
console.log(`center = [${center[0]}, ${center[1]}]`);
console.log(
  `bbox   = x[${minX.toFixed(6)}, ${maxX.toFixed(6)}] y[${minY.toFixed(6)}, ${maxY.toFixed(6)}]`,
);
console.log(`         依据 ${bboxPointCount.toLocaleString("en-US")} 个坐标点`);
console.log(
  `高速路网 ${lineCount.toLocaleString("en-US")} 条线 / ${pointCount.toLocaleString("en-US")} 点 / ${segmentCount.toLocaleString("en-US")} 段${skipped ? `（剔除 ${skipped} 条短线）` : ""}`,
);
console.log(
  `         ${OUT_BIN}  ${mb(buffer.length)}（原 JSON ${mb(fs.statSync(path.join(ASSETS, "hb-highway.json")).size)}）`,
);
console.log("✓ 十进制往返无损、二进制逐点回读一致");
console.log(`已写入 ${OUT_TS}`);
