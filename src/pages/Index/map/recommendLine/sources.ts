import type { AdministrativeGeoJSON, MapRegionId, MapRegionSource } from "./types";
import { asAdministrativeData } from "./geojson";

/**
 * 地图资源注册表。
 *
 * GeoJSON 用**非 eager** 的 glob —— 每个文件单独成 chunk，切换线路时只请求该
 * 线路用到的区域。改造前 31 个静态 import 加一处 eager glob 把约 4.7MB 数据
 * 内联进了 RecommendLineMap chunk，是打包体积的主要来源。
 *
 * 贴图则保持 eager：`?url` 只产出 URL 字符串，本身几乎不占体积，真正的图片
 * 仍由 loadMapRegionTexture 按需加载。
 */
export const geojsonLoaderByPath = import.meta.glob<AdministrativeGeoJSON>(
  "/src/assets/recommendLine/*.json",
  { import: "default" },
);
export const textureUrlByPath = import.meta.glob<string>(
  "/src/assets/recommendLine/*.webp",
  { eager: true, import: "default", query: "?url" },
);

/** 文件名转小写作为 id：磁盘上是 Shaanxi.json，而线路配置里写的是 "shaanxi"。 */
export function idFromAssetPath(assetPath: string) {
  return assetPath
    .split("/")
    .at(-1)!
    .replace(/\.[^.]+$/, "")
    .toLowerCase();
}

export const geojsonLoaderById = new Map(
  Object.entries(geojsonLoaderByPath).map(
    ([assetPath, load]) => [idFromAssetPath(assetPath), load] as const,
  ),
);
export const textureUrlById = new Map(
  Object.entries(textureUrlByPath).map(
    ([assetPath, url]) => [idFromAssetPath(assetPath), url] as const,
  ),
);

export function kindOfRegion(id: string): MapRegionSource["kind"] {
  if (id === "china") return "china";
  if (id === "nanhai") return "inset";
  if (id.startsWith("out-")) return "out";
  return "province";
}

/**
 * 嵌图区域（角落小图）。这类区域刻意被排除在三条链路之外：
 * 主体包围盒 / fitScale、out 碰撞占位、POI 经纬度命中。
 */
export function isInsetKind(kind: MapRegionSource["kind"]) {
  return kind === "inset";
}

/** 单标签区域：feature 太多或太碎，逐个标注只会糊成一片。 */
const REGION_LABEL_BY_ID: Partial<Record<string, string>> = {
  china: "中国",
  nanhai: "南海诸岛",
};

export const mapRegionSourceById = new Map<MapRegionId, MapRegionSource>();
export const mapRegionSourcePromiseById = new Map<
  MapRegionId,
  Promise<MapRegionSource>
>();

/** 按需加载单个区域的 GeoJSON；同一 id 的并发调用只发一次请求。 */
export function loadMapRegionSource(id: MapRegionId): Promise<MapRegionSource> {
  const loaded = mapRegionSourceById.get(id);
  if (loaded) return Promise.resolve(loaded);

  const pending = mapRegionSourcePromiseById.get(id);
  if (pending) return pending;

  const load = geojsonLoaderById.get(id);
  if (!load) {
    return Promise.reject(
      new Error(`未找到地图资源：assets/recommendLine/${id}.json`),
    );
  }

  const promise = load()
    .then((data) => {
      const source: MapRegionSource = {
        id,
        data: asAdministrativeData(data),
        kind: kindOfRegion(id),
        texture: textureUrlById.get(id),
        ...(REGION_LABEL_BY_ID[id] ? { label: REGION_LABEL_BY_ID[id] } : null),
      };
      mapRegionSourceById.set(id, source);
      return source;
    })
    .catch((error: unknown) => {
      mapRegionSourcePromiseById.delete(id);
      throw error;
    });
  mapRegionSourcePromiseById.set(id, promise);
  return promise;
}

/** 预加载一条线路需要的全部区域，供 prepareRoute 在布局计算前 await。 */
export function ensureRouteSources(mapIds: readonly MapRegionId[]) {
  return Promise.all(mapIds.map(loadMapRegionSource));
}

/** 同步取用；调用前必须已经过 ensureRouteSources。 */
export function getMapRegionSource(id: MapRegionId) {
  const source = mapRegionSourceById.get(id);
  if (!source) {
    throw new Error(`地图资源“${id}”尚未加载，需先调用 ensureRouteSources`);
  }
  return source;
}
