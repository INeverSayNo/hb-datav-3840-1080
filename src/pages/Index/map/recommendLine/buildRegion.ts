import { Box2, Path, Shape, ShapeUtils, Vector2 } from "three";

import { MAP_DEPTH } from "../threeShared";
import { getLines, getPolygons } from "./geojson";
import { getProjection } from "./projection";
import { getMapRegionSource } from "./sources";
import type {
  Coordinate,
  MapRegionId,
  MapRegionSource,
  ProjectedMapRegion,
} from "./types";

const projectedMapRegionCache = new Map<MapRegionId, ProjectedMapRegion>();

export function buildMapRegion(source: MapRegionSource): ProjectedMapRegion {
  const projection = getProjection();
  const bbox = new Box2();
  const labelDataByName = new Map<
    string,
    { bounds: Box2; preferredPosition?: Vector2 }
  >();

  const shapes: Shape[] = [];
  const lineSegments: [number, number, number][] = [];
  source.data.features.forEach((feature) => {
    const featureBounds = new Box2();
    const project = (coordinate: Coordinate) => {
      const [x, y] = projection(coordinate)!;
      const point = new Vector2(x, -y);
      bbox.expandByPoint(point);
      featureBounds.expandByPoint(point);
      return point;
    };
    getPolygons(feature.geometry).forEach((polygon) => {
      const rings = polygon.map((ring) => ring.map(project));
      const outer = rings[0];
      if (!outer || outer.length < 3) return;
      if (!ShapeUtils.isClockWise(outer)) outer.reverse();

      const shape = new Shape(outer);
      rings.slice(1).forEach((ring) => {
        if (ring.length < 3) return;
        if (ShapeUtils.isClockWise(ring)) ring.reverse();
        shape.holes.push(new Path(ring));
      });
      shapes.push(shape);
    });

    // 折线（十段线）：只投影成线段对，不建 Shape、不参与挤出。
    const lines = getLines(feature.geometry);
    lines.forEach((line) => {
      const points = line.map(project);
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        lineSegments.push(
          [previous.x, previous.y, 0],
          [current.x, current.y, 0],
        );
      }
    });
    // 折线没有面积，给它挂标签只会在图上落一个孤零零的名字。
    if (lines.length > 0) return;

    const featureName = feature.properties.name || source.id;
    const labelData = labelDataByName.get(featureName) ?? {
      bounds: new Box2(),
    };
    labelData.bounds.union(featureBounds);
    const labelCoordinate =
      feature.properties.centroid ?? feature.properties.center;
    if (!labelData.preferredPosition && labelCoordinate) {
      const [x, y] = projection(labelCoordinate)!;
      labelData.preferredPosition = new Vector2(x, -y);
    }
    labelDataByName.set(featureName, labelData);
  });

  const boundarySegments: [number, number, number][] = [];
  shapes.forEach((shape) => {
    [shape.getPoints(), ...shape.holes.map((hole) => hole.getPoints())]
      .filter((ring) => ring.length > 1)
      .forEach((ring) => {
        const closedRing = [...ring, ring[0]];
        for (let index = 1; index < closedRing.length; index += 1) {
          const previous = closedRing[index - 1];
          const current = closedRing[index];
          boundarySegments.push(
            [previous.x, previous.y, MAP_DEPTH + 0.018],
            [current.x, current.y, MAP_DEPTH + 0.018],
          );
        }
      });
  });

  const labels = source.label
    ? [
        {
          position: [
            bbox.getCenter(new Vector2()).x,
            bbox.getCenter(new Vector2()).y,
            MAP_DEPTH + 0.12,
          ] as [number, number, number],
          text: source.label,
        },
      ]
    : Array.from(labelDataByName, ([text, labelData]) => {
        const labelPoint =
          labelData.preferredPosition ??
          labelData.bounds.getCenter(new Vector2());
        return {
          position: [labelPoint.x, labelPoint.y, MAP_DEPTH + 0.12] as [
            number,
            number,
            number,
          ],
          text,
        };
      });

  return {
    ...source,
    bbox,
    shapes,
    boundarySegments,
    lineSegments,
    labels,
  };
}

export function getProjectedMapRegion(id: MapRegionId) {
  const cached = projectedMapRegionCache.get(id);
  if (cached) return cached;

  const projected = buildMapRegion(getMapRegionSource(id));
  projectedMapRegionCache.set(id, projected);
  return projected;
}
