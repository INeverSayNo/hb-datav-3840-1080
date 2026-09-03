// src/utils/geo.ts
import hubeiOutline from "@/assets/hb_outline.json";

/** 单环点包含判断（射线法 / 奇偶规则） */
function pointInRing([px, py]: [number, number], ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** MultiPolygon：任一外环包含点，且不在该多边形的洞里 */
export function isPointInHubei(lng: number, lat: number): boolean {
  const polygons = hubeiOutline.features[0].geometry.coordinates;
  return polygons.some(([outer, ...holes]) => {
    const point: [number, number] = [lng, lat];
    return pointInRing(point, outer) && !holes.some((h) => pointInRing(point, h));
  });
}