import { Vector2 } from "three";

import type { OutMapPlacement } from "../../recommendLineRoutes";
import {
  DEFAULT_INSET_SIZE,
  DEFAULT_OUT_SIZE,
  MAP_COLLISION_GAP,
  MAP_LAYOUT_MARGIN,
  MAP_STAGE_HEIGHT,
  MAP_STAGE_WIDTH,
} from "./constants";
import type { ProjectedMapRegion } from "./types";

export type PixelRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

/**
 * 把矩形约束在舞台内。
 *
 * margin 可调是给嵌图用的：主体/out 统一留 MAP_LAYOUT_MARGIN(70)，
 * 而角标想更贴边就得放宽这个下限。注意 WebGL 画布就是 MapStage 本身
 * （2340×1570），margin 给到 0 也只是贴边，越不过画布——y 超过 1570
 * 的内容根本不存在。
 */
export function clampRect(
  rect: PixelRect,
  margin = MAP_LAYOUT_MARGIN,
): PixelRect {
  return {
    ...rect,
    x: Math.min(
      MAP_STAGE_WIDTH - margin - rect.width,
      Math.max(margin, rect.x),
    ),
    y: Math.min(
      MAP_STAGE_HEIGHT - margin - rect.height,
      Math.max(margin, rect.y),
    ),
  };
}

export function rectanglesOverlap(a: PixelRect, b: PixelRect, gap = 0) {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

export function defaultOutPlacement(index: number, count: number): OutMapPlacement {
  const columns = count <= 2 ? 1 : 2;
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  const columnWidth = 390;
  const usableHeight = MAP_STAGE_HEIGHT - MAP_LAYOUT_MARGIN * 2;

  return {
    positionPx: [
      MAP_STAGE_WIDTH - 260 - (columns - 1 - column) * columnWidth,
      MAP_LAYOUT_MARGIN + ((row + 0.5) * usableHeight) / rows,
    ],
    sizePx: DEFAULT_OUT_SIZE,
  };
}

/**
 * 嵌图缺省落位：MapStage 右下角。
 * 只有线路写了嵌图 id 却漏配 insetPlacements 时才会用到——保证它仍然落在角落，
 * 而不是悄悄掉回主体桶、把主体包围盒拉到南海去。
 */
export function defaultInsetPlacement(): OutMapPlacement {
  return {
    positionPx: [
      MAP_STAGE_WIDTH - MAP_LAYOUT_MARGIN - 104,
      MAP_STAGE_HEIGHT - MAP_LAYOUT_MARGIN - 154,
    ],
    sizePx: DEFAULT_INSET_SIZE,
  };
}

export function fitPlacementRect(
  region: ProjectedMapRegion,
  placement: OutMapPlacement,
  margin = MAP_LAYOUT_MARGIN,
): PixelRect {
  const size = region.bbox.getSize(new Vector2());
  const pixelScale = Math.min(
    placement.sizePx[0] / Math.max(size.x, 0.001),
    placement.sizePx[1] / Math.max(size.y, 0.001),
  );
  const width = size.x * pixelScale;
  const height = size.y * pixelScale;
  return clampRect(
    {
      height,
      width,
      x: placement.positionPx[0] - width / 2,
      y: placement.positionPx[1] - height / 2,
    },
    margin,
  );
}

export function avoidOutCollisions(rect: PixelRect, occupied: PixelRect[]) {
  if (
    !occupied.some((other) => rectanglesOverlap(rect, other, MAP_COLLISION_GAP))
  ) {
    return rect;
  }

  const originalCenter = new Vector2(
    rect.x + rect.width / 2,
    rect.y + rect.height / 2,
  );
  for (let radius = 40; radius <= MAP_STAGE_WIDTH; radius += 40) {
    for (let step = 0; step < 16; step += 1) {
      const angle = (step / 16) * Math.PI * 2;
      const candidate = clampRect({
        ...rect,
        x: originalCenter.x + Math.cos(angle) * radius - rect.width / 2,
        y: originalCenter.y + Math.sin(angle) * radius - rect.height / 2,
      });
      if (
        !occupied.some((other) =>
          rectanglesOverlap(candidate, other, MAP_COLLISION_GAP),
        )
      ) {
        return candidate;
      }
    }
  }

  return rect;
}

export function getAutomaticMainRect(outRects: PixelRect[]): PixelRect {
  const fullRect: PixelRect = {
    x: MAP_LAYOUT_MARGIN,
    y: MAP_LAYOUT_MARGIN,
    width: MAP_STAGE_WIDTH - MAP_LAYOUT_MARGIN * 2,
    height: MAP_STAGE_HEIGHT - MAP_LAYOUT_MARGIN * 2,
  };
  if (outRects.length === 0) return fullRect;

  const minLeft = Math.min(...outRects.map(({ x }) => x));
  const maxRight = Math.max(...outRects.map(({ x, width }) => x + width));
  const minTop = Math.min(...outRects.map(({ y }) => y));
  const maxBottom = Math.max(...outRects.map(({ y, height }) => y + height));
  const candidates: PixelRect[] = [
    { ...fullRect, width: minLeft - MAP_COLLISION_GAP - fullRect.x },
    {
      ...fullRect,
      x: maxRight + MAP_COLLISION_GAP,
      width: fullRect.x + fullRect.width - maxRight - MAP_COLLISION_GAP,
    },
    { ...fullRect, height: minTop - MAP_COLLISION_GAP - fullRect.y },
    {
      ...fullRect,
      y: maxBottom + MAP_COLLISION_GAP,
      height: fullRect.y + fullRect.height - maxBottom - MAP_COLLISION_GAP,
    },
  ];

  return (
    candidates
      .filter(({ width, height }) => width >= 520 && height >= 420)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? fullRect
  );
}
