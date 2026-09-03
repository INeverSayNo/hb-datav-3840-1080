/**
 * 重写 recommendLine 下的 GeoJSON：坐标精度截断 + 去除缩进。
 *
 * 这些文件里 out-*.json 是 pretty-print 且坐标带 14~15 位小数，
 * 每个坐标点的字节数是省份文件的 5 倍左右 —— 瓶颈是格式而非几何密度，
 * 所以只做精度截断和 minify，不做 Douglas-Peucker 简化。
 *
 * 4 位小数在本项目的渲染尺度下最大屏幕偏移约 0.006px（含 1.8x 放大）。
 *
 * 注意：本脚本会改变坐标极值，进而改变投影的 center/scale。
 * 跑完必须接着跑 precompute-projection.mjs 重新生成常量。
 *
 * 用法: node scripts/optimize-geojson.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";

const DIR = "src/assets/recommendLine";
const PRECISION = 4;
const DRY = process.argv.includes("--dry");

/** 任何线路都未引用的文件，直接删除。 */
const UNUSED = [
  "out-de.json",
  "out-es.json",
  "out-fr.json",
  "out-it.json",
  "out-pl.json",
  "hainan1.json",
  "sansha.json",
];

const factor = 10 ** PRECISION;

/** 只对坐标数组递归取整；properties 里的 center/centroid 保持原样。 */
function roundCoordinates(node) {
  if (!Array.isArray(node)) return node;
  if (typeof node[0] === "number") {
    return node.map((n) => Math.round(n * factor) / factor);
  }
  return node.map(roundCoordinates);
}

function featuresOf(json) {
  return json.type === "FeatureCollection" ? json.features : [json];
}

const kb = (n) => `${Math.round(n / 1024)}KB`;

let beforeTotal = 0;
let afterTotal = 0;
let rewritten = 0;

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const full = path.join(DIR, file);

  if (UNUSED.includes(file)) {
    const size = fs.statSync(full).size;
    console.log(`删除  ${file.padEnd(20)} ${kb(size)}（无线路引用）`);
    if (!DRY) fs.unlinkSync(full);
    continue;
  }

  const raw = fs.readFileSync(full, "utf8");
  const json = JSON.parse(raw);

  for (const feature of featuresOf(json)) {
    if (!feature?.geometry?.coordinates) {
      throw new Error(`${file} 中存在没有 geometry.coordinates 的 feature`);
    }
    feature.geometry.coordinates = roundCoordinates(
      feature.geometry.coordinates,
    );
  }

  const out = JSON.stringify(json);
  beforeTotal += raw.length;
  afterTotal += out.length;
  rewritten += 1;

  if (!DRY) fs.writeFileSync(full, out);
  console.log(
    `重写  ${file.padEnd(20)} ${kb(raw.length)} -> ${kb(out.length)}`,
  );
}

const pct = (100 - (afterTotal / beforeTotal) * 100).toFixed(1);
console.log("─".repeat(52));
console.log(
  `${rewritten} 个文件：${kb(beforeTotal)} -> ${kb(afterTotal)}（减少 ${pct}%）`,
);
if (DRY) console.log("(--dry：未写入磁盘)");
else console.log("下一步：node scripts/precompute-projection.mjs");
