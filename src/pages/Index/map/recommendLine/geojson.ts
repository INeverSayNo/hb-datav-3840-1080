import type {
  AdministrativeFeature,
  AdministrativeGeoJSON,
  AdministrativeGeometry,
  Coordinate,
  PolygonCoordinates,
} from "./types";

export function asAdministrativeData(data: unknown): AdministrativeGeoJSON {
  const geoData = data as AdministrativeGeoJSON | AdministrativeFeature;
  return geoData.type === "FeatureCollection"
    ? geoData
    : { type: "FeatureCollection", features: [geoData] };
}

/** 面几何的环坐标；折线几何返回空数组。 */
export function getPolygons(
  geometry: AdministrativeGeometry,
): PolygonCoordinates[] {
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

/** 折线几何的点串（如十段线的 10 段）；面几何返回空数组。 */
export function getLines(geometry: AdministrativeGeometry): Coordinate[][] {
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}
