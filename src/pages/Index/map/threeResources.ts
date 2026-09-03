/**
 * 湖北省域地图（three.tsx）的异步资源加载。
 *
 * 原本 5 份 GeoJSON 都是 `three.tsx` 顶部的静态 import。Vite 会把 `.json` 编译成
 * JS 模块，于是 2.6MB 的 hb-highway.json 变成一段数组字面量内联进 three chunk
 * （2.79MB）—— 必须整段下载完并被 JS 引擎解析完，模块体才开始执行，而
 * `useTexture(hb_dem)` 在模块体里，所以**贴图下载被 chunk 串行堵在后面**。
 *
 * 这里照 recommendLine/{sources,resources}.ts 的既有做法改成 `?url` + fetch：
 *   - three chunk 掉回纯代码量级，地图数据与贴图并行下载
 *   - `JSON.parse` 比解析等量的 JS 源码更快
 *   - 数据与代码分开缓存（数据几乎不变，代码经常变）
 *
 * 分成 base / road 两批，配合 three.tsx 的渐进渲染：
 *   base（约 360KB）出底图，road（1.03MB 二进制）在首帧之后补上。
 */
import { SRGBColorSpace, TextureLoader, type Texture } from "three";

import type { CityGeoJSON } from "@/types/map";

import hbCitiesUrl from "@/assets/hb.json?url";
import hbOutlineUrl from "@/assets/hb_outline.json?url";
import hbRailwayUrl from "@/assets/hb-railway.json?url";
import hbWaterwayUrl from "@/assets/hb-waterway.json?url";
import hbHighwayBinUrl from "@/assets/hb-highway.bin?url";
import hbDemLowUrl from "@/assets/hb_dem-low.webp";
import hbDemUrl from "@/assets/hb_dem.webp";

import { HB_MAP_BBOX, HB_PROJECTION_CENTER } from "./hbProjection.generated";

/** 低清 DEM：先上屏的占位图，由 three.tsx 通过 useTexture 加载（会 suspend）。 */
export { hbDemLowUrl };

export type MultiLineStringData = {
  type: "MultiLineString";
  coordinates: [number, number][][];
};

/** 首帧需要的最小数据集。 */
export type HubeiBaseGeo = {
  cities: CityGeoJSON;
  outline: CityGeoJSON;
};

/** 首帧之后补上的路网数据。 */
export type HubeiRoadGeo = {
  /** 已在构建期投影好的高速路网（见 scripts/precompute-hb-map.mjs）。 */
  highway: { lineLengths: Uint32Array; xy: Float32Array };
  railway: MultiLineStringData;
  waterway: MultiLineStringData;
};

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${label} 加载失败：HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

const HIGHWAY_MAGIC = "HBHW";
const HIGHWAY_VERSION = 1;
const HIGHWAY_HEADER_BYTES = 16;

/**
 * 解析 hb-highway.bin。布局（小端）：
 *   0  char[4] "HBHW" / 4 uint32 version / 8 uint32 lineCount / 12 uint32 pointCount
 *   16 uint32[lineCount]         每条线的点数
 *   .. float32[pointCount * 2]   已投影的 x, y 交替（y 已取反）
 * z 是常量，不入文件，由调用方展开时写入。
 */
function parseHighwayBinary(buffer: ArrayBuffer): HubeiRoadGeo["highway"] {
  if (buffer.byteLength < HIGHWAY_HEADER_BYTES) {
    throw new Error("高速路网二进制过短");
  }
  const view = new DataView(buffer);
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  if (magic !== HIGHWAY_MAGIC) {
    throw new Error(`高速路网二进制标识不符：${magic}`);
  }
  const version = view.getUint32(4, true);
  if (version !== HIGHWAY_VERSION) {
    throw new Error(
      `高速路网二进制版本不符：${version}，期望 ${HIGHWAY_VERSION}（重跑 scripts/precompute-hb-map.mjs）`,
    );
  }
  const lineCount = view.getUint32(8, true);
  const pointCount = view.getUint32(12, true);
  const expected = HIGHWAY_HEADER_BYTES + lineCount * 4 + pointCount * 8;
  if (buffer.byteLength !== expected) {
    throw new Error(
      `高速路网二进制长度不符：${buffer.byteLength}，期望 ${expected}`,
    );
  }

  return {
    lineLengths: new Uint32Array(buffer, HIGHWAY_HEADER_BYTES, lineCount),
    xy: new Float32Array(
      buffer,
      HIGHWAY_HEADER_BYTES + lineCount * 4,
      pointCount * 2,
    ),
  };
}

let baseGeoPromise: Promise<HubeiBaseGeo> | null = null;
let roadGeoPromise: Promise<HubeiRoadGeo> | null = null;

/** 失败后清掉缓存，让下次挂载能重试（与 recommendLine 的做法一致）。 */
function withRetryableCache<T>(
  promise: Promise<T>,
  clear: () => void,
): Promise<T> {
  return promise.catch((error: unknown) => {
    clear();
    throw error;
  });
}

export function loadHubeiBaseGeo(): Promise<HubeiBaseGeo> {
  if (baseGeoPromise) return baseGeoPromise;

  baseGeoPromise = withRetryableCache(
    Promise.all([
      fetchJson<CityGeoJSON>(hbCitiesUrl, "湖北市界"),
      fetchJson<CityGeoJSON>(hbOutlineUrl, "湖北省界轮廓"),
    ]).then(([cities, outline]) => {
      assertBboxMatchesGeneratedConstants(cities, outline);
      return { cities, outline };
    }),
    () => {
      baseGeoPromise = null;
    },
  );
  return baseGeoPromise;
}

export function loadHubeiRoadGeo(): Promise<HubeiRoadGeo> {
  if (roadGeoPromise) return roadGeoPromise;

  roadGeoPromise = withRetryableCache(
    Promise.all([
      fetch(hbHighwayBinUrl).then(async (response) => {
        if (!response.ok) {
          throw new Error(`高速路网加载失败：HTTP ${response.status}`);
        }
        return parseHighwayBinary(await response.arrayBuffer());
      }),
      fetchJson<MultiLineStringData>(hbRailwayUrl, "湖北铁路"),
      fetchJson<MultiLineStringData>(hbWaterwayUrl, "湖北水路"),
    ]).then(([highway, railway, waterway]) => ({
      highway,
      railway,
      waterway,
    })),
    () => {
      roadGeoPromise = null;
    },
  );
  return roadGeoPromise;
}

const demTextureLoader = new TextureLoader();
let fullDemPromise: Promise<Texture> | null = null;

/**
 * 全清 DEM（5656×3614）。**必须命令式换入**：改 `useTexture` 的入参会重新
 * suspend，把整个场景卸载成白屏。调用方拿到贴图后直接写材质的 uniform。
 *
 * 不做降分辨率：OrbitControls 的 minDistance=10 / 默认边距≈29，用户能放大 2.9 倍，
 * 而这张图在默认视角只过采样约 1.6 倍 —— 放大到底时已经欠量，再降会明显发虚。
 */
export function loadHubeiFullDem(): Promise<Texture> {
  if (fullDemPromise) return fullDemPromise;

  fullDemPromise = withRetryableCache(
    demTextureLoader.loadAsync(hbDemUrl).then((texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      return texture;
    }),
    () => {
      fullDemPromise = null;
    },
  );
  return fullDemPromise;
}

/** 供 wrapper.tsx 预热（hover 意图 / 空闲时段）。 */
export function preloadHubeiMap(): Promise<void> {
  return loadHubeiBaseGeo().then(() => undefined);
}

/**
 * 开发模式兜底：bbox 常量是构建期算的（scripts/precompute-hb-map.mjs），
 * 源 GeoJSON 改了却忘记重跑脚本时，DEM 贴图的 UV 会静默偏移。这里用真实数据
 * 重算一遍并告警。只在 DEV 下跑（生产环境这段会被摇掉，也拿不到铁路/水路数据）。
 */
function assertBboxMatchesGeneratedConstants(
  cities: CityGeoJSON,
  outline: CityGeoJSON,
) {
  if (!import.meta.env.DEV) return;

  void (async () => {
    try {
      const { geoMercator } = await import("d3-geo");
      const [railway, waterway] = await Promise.all([
        fetchJson<MultiLineStringData>(hbRailwayUrl, "湖北铁路"),
        fetchJson<MultiLineStringData>(hbWaterwayUrl, "湖北水路"),
      ]);
      const projection = geoMercator()
        .center(HB_PROJECTION_CENTER)
        .translate([0, 0]);

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const expand = (coordinate: number[]) => {
        const projected = projection(coordinate as [number, number]);
        if (!projected) return;
        const x = projected[0];
        const y = -projected[1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      };

      for (const source of [outline, cities]) {
        for (const feature of source.features) {
          for (const polygon of feature.geometry.coordinates) {
            for (const ring of polygon) ring.forEach(expand);
          }
        }
      }
      for (const source of [railway, waterway]) {
        for (const line of source.coordinates) {
          if (line.length < 2) continue;
          line.forEach(expand);
        }
      }

      const drift = Math.max(
        Math.abs(minX - HB_MAP_BBOX.minX),
        Math.abs(minY - HB_MAP_BBOX.minY),
        Math.abs(maxX - HB_MAP_BBOX.maxX),
        Math.abs(maxY - HB_MAP_BBOX.maxY),
      );
      if (drift > 1e-9) {
        console.error(
          `[hb-map] bbox 常量与实际数据不一致（偏差 ${drift.toExponential(2)}），` +
            "DEM 贴图 UV 会偏移。请重跑 node scripts/precompute-hb-map.mjs",
          { generated: HB_MAP_BBOX, actual: { minX, minY, maxX, maxY } },
        );
      }
    } catch {
      // 校验本身失败不影响地图渲染
    }
  })();
}
