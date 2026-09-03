import { SRGBColorSpace, TextureLoader, type Texture } from "three";

import type { RecommendMapId, RecommendRoute } from "../../recommendLineRoutes";
import {
  ENTER_DURATION,
  EXIT_DURATION,
  REDUCED_MOTION_DURATION,
} from "./constants";
import { getRouteLayout } from "./routeLayout";
import { ensureRouteSources, getMapRegionSource } from "./sources";
import type { PreparedRoute } from "./types";

const textureCache = new Map<RecommendMapId, Texture>();
const texturePromiseCache = new Map<RecommendMapId, Promise<Texture>>();
const preparedRoutePromiseCache = new Map<string, Promise<PreparedRoute>>();
const textureLoader = new TextureLoader();

/**
 * 释放全部贴图显存。全项目只有 31 张贴图，做 LRU 没有意义（永远不会触发淘汰），
 * 真正的问题是离开精品线路视图后这 ~63MB 显存一直不还。
 *
 * 这里连同 preparedRoutePromiseCache 一起清，避免缓存的 PreparedRoute 继续持有
 * 已 dispose 的 Texture 引用。投影/布局这类纯 CPU 缓存保留，重新进入时无需再算。
 */
export function releaseTextures() {
  textureCache.forEach((texture) => texture.dispose());
  textureCache.clear();
  texturePromiseCache.clear();
  preparedRoutePromiseCache.clear();
}

/**
 * 卸载后延迟释放，期间重新挂载则取消。
 * 既避开 StrictMode 在开发环境的「挂载→卸载→挂载」双调用，
 * 也避免用户来回快速切换视图时反复丢弃再重传贴图。
 */
export const TEXTURE_RELEASE_DELAY = 1500;
export let textureReleaseTimer: number | null = null;

export function cancelScheduledTextureRelease() {
  if (textureReleaseTimer !== null) {
    window.clearTimeout(textureReleaseTimer);
    textureReleaseTimer = null;
  }
}

export function scheduleTextureRelease() {
  cancelScheduledTextureRelease();
  textureReleaseTimer = window.setTimeout(() => {
    textureReleaseTimer = null;
    releaseTextures();
  }, TEXTURE_RELEASE_DELAY);
}

export function loadMapRegionTexture(id: RecommendMapId) {
  const cachedTexture = textureCache.get(id);
  if (cachedTexture) {
    return Promise.resolve(cachedTexture);
  }

  const cachedPromise = texturePromiseCache.get(id);
  if (cachedPromise) return cachedPromise;

  const textureUrl = getMapRegionSource(id).texture;
  if (!textureUrl) {
    return Promise.reject(new Error(`地图资源“${id}”没有纹理`));
  }

  const texturePromise = textureLoader
    .loadAsync(textureUrl)
    .then((texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      textureCache.set(id, texture);
      return texture;
    })
    .catch((error: unknown) => {
      texturePromiseCache.delete(id);
      throw error;
    });
  texturePromiseCache.set(id, texturePromise);
  return texturePromise;
}

export function prepareRoute(route: RecommendRoute) {
  const cached = preparedRoutePromiseCache.get(route.mapKey);
  if (cached) return cached;

  // 先把这条线路用到的 GeoJSON 拉齐，getRouteLayout 及其下游都是同步读取 source。
  const preparedPromise = ensureRouteSources(route.mapIds)
    .then(async () => {
      const layout = getRouteLayout(route);
      const texturedMapIds = route.mapIds.filter(
        (id) => getMapRegionSource(id).texture,
      );
      const textures = await Promise.all(
        texturedMapIds.map(
          async (id) => [id, await loadMapRegionTexture(id)] as const,
        ),
      );
      return { layout, textures: new Map(textures) } satisfies PreparedRoute;
    })
    .catch((error: unknown) => {
      preparedRoutePromiseCache.delete(route.mapKey);
      throw error;
    });
  preparedRoutePromiseCache.set(route.mapKey, preparedPromise);
  return preparedPromise;
}

export function getMotionDurations() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  return reduceMotion
    ? { enter: REDUCED_MOTION_DURATION, exit: REDUCED_MOTION_DURATION }
    : { enter: ENTER_DURATION, exit: EXIT_DURATION };
}
