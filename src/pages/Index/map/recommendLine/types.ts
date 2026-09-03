import type { Box2, Shape, Texture, Vector2 } from "three";

import type { RecommendMapId } from "../../recommendLineRoutes";

export type Coordinate = [number, number];
export type PolygonCoordinates = Coordinate[][];

export type AdministrativeGeometry =
  | { type: "Polygon"; coordinates: PolygonCoordinates }
  | { type: "MultiPolygon"; coordinates: PolygonCoordinates[] }
  | { type: "LineString"; coordinates: Coordinate[] }
  | { type: "MultiLineString"; coordinates: Coordinate[][] };

export type AdministrativeProperties = {
  name: string;
  center?: Coordinate;
  centroid?: Coordinate;
};

export type AdministrativeFeature = {
  type: "Feature";
  properties: AdministrativeProperties;
  geometry: AdministrativeGeometry;
};

export type AdministrativeGeoJSON = {
  type: "FeatureCollection";
  features: AdministrativeFeature[];
};

/** `"sansha"` 已并入 RecommendMapId（现名 `"nanhai"`），保留别名避免调用点大改。 */
export type MapRegionId = RecommendMapId;

export type MapRegionSource = {
  id: MapRegionId;
  data: AdministrativeGeoJSON;
  kind?: "china" | "out" | "province" | "inset";
  label?: string;
  texture?: string;
};

export type ProjectedMapRegion = MapRegionSource & {
  bbox: Box2;
  shapes: Shape[];
  boundarySegments: [number, number, number][];
  /**
   * 折线几何（如十段线）投影后的线段对，位于该区域的**局部**坐标系。
   * 不建 Shape、不参与挤出；由 Scene 在区域 group 内直接渲染。
   */
  lineSegments: [number, number, number][];
  labels: Array<{
    position: [number, number, number];
    text: string;
  }>;
  transform?: {
    position: [number, number, 0];
    scale: number;
  };
  /**
   * 嵌图外框，位于该区域的**局部**坐标系（= bbox 各向外扩 padding）。
   * padding 已按 effectiveScale 折算，保证边框相对内容的屏幕留白恒定。
   */
  insetFrame?: {
    min: [number, number];
    max: [number, number];
  };
};

export type ProjectedRouteLayout = {
  boundarySegments: [number, number, number][];
  chinaBoundarySegments: [number, number, number][];
  center: Vector2;
  fitScale: number;
  mapKey: string;
  regions: ProjectedMapRegion[];
  viewMode: "regional" | "world";
};

export type PreparedRoute = {
  layout: ProjectedRouteLayout;
  textures: ReadonlyMap<RecommendMapId, Texture>;
};

export type MapTransitionPhase = "hidden" | "entering" | "visible" | "exiting";
