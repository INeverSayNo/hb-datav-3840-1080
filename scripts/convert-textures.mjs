/**
 * 把 PNG 贴图/大图转成 WebP，成功后删除原 PNG。
 *
 * 这些图都是 RGBA（省份贴图靠 alpha 做省界遮罩），WebP 支持 alpha。
 * 注意 WebP 只减小传输体积，解码后的显存占用不变 —— 显存靠运行时的
 * releaseTextures() 在离开视图时归还。
 *
 * 贴图尺寸不要动：实测多数省份贴图相对屏幕过采样约 1.56x，恰好对应
 * Canvas 的 dpr={[1, 1.5]}；xinjiang / neimenggu 只有 0.78x，降分辨率会糊。
 *
 * 用法: node scripts/convert-textures.mjs [--dry] [--quality 90]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DRY = process.argv.includes("--dry");
const qIndex = process.argv.indexOf("--quality");
const QUALITY = qIndex !== -1 ? Number(process.argv[qIndex + 1]) : 90;

/** 目录下全部 PNG，或显式列出的单个文件。 */
const TARGETS = [
  { dir: "src/assets/recommendLine" },
  // src/assets 下的 UI 切图与大图全部转：这些 PNG 合计约 9.5MB，且基本都在
  // Index 首屏，直接跟地图 chunk 抢带宽。WebP 后预计降到 2-3MB。
  { dir: "src/assets" },
];

function collect() {
  const files = [];
  for (const target of TARGETS) {
    const names = target.only ?? fs.readdirSync(target.dir).filter((f) => f.endsWith(".png"));
    for (const name of names) {
      const full = path.join(target.dir, name);
      if (fs.existsSync(full)) files.push(full);
      else console.warn(`跳过（不存在）: ${full}`);
    }
  }
  return files;
}

const mb = (n) => (n / 1024 / 1024).toFixed(2) + "MB";
const kb = (n) => Math.round(n / 1024) + "KB";

let before = 0;
let after = 0;
const failures = [];

for (const src of collect()) {
  const out = src.replace(/\.png$/, ".webp");
  const srcSize = fs.statSync(src).size;

  if (DRY) {
    console.log(`[dry] ${src} -> ${path.basename(out)}`);
    before += srcSize;
    continue;
  }

  try {
    execFileSync(
      "ffmpeg",
      ["-y", "-hide_banner", "-loglevel", "error",
       "-i", src,
       "-c:v", "libwebp", "-quality", String(QUALITY), "-compression_level", "6",
       out],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
  } catch (error) {
    failures.push({ src, error: String(error) });
    console.error(`✗ 转换失败: ${src}`);
    continue;
  }

  const outSize = fs.statSync(out).size;
  if (outSize === 0) {
    failures.push({ src, error: "输出为空" });
    fs.unlinkSync(out);
    console.error(`✗ 输出为空: ${src}`);
    continue;
  }

  before += srcSize;
  after += outSize;
  fs.unlinkSync(src);
  console.log(
    `${path.basename(src).padEnd(24)} ${kb(srcSize).padStart(8)} -> ${kb(outSize).padStart(7)}`,
  );
}

console.log("─".repeat(52));
if (DRY) {
  console.log(`[dry] 共 ${collect().length} 个文件，合计 ${mb(before)}，未做转换`);
} else {
  const pct = before ? (100 - (after / before) * 100).toFixed(1) : "0";
  console.log(`合计 ${mb(before)} -> ${mb(after)}（减少 ${pct}%），质量 q${QUALITY}`);
  if (failures.length) {
    console.error(`\n${failures.length} 个失败，原 PNG 已保留：`);
    failures.forEach((f) => console.error(`  ${f.src}`));
    process.exit(1);
  }
}
