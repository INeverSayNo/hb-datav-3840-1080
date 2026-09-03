/**
 * POI 标签碰撞处理：标签重叠时堆叠错开，并用指向性线条连接节点。
 * 由 three.tsx（湖北 POI）与 recommendLine（精品线路 POI）共用。
 *
 * DOM 约定：
 * - marker 内含 [data-poi-icon]（节点/图标，导引线指向其顶部）
 * - marker 内含 [data-poi-label]（标签本体）
 * - 解析结果写回 marker 的 CSS 变量：
 *   --poi-label-offset-y     标签向上平移量（marker 局部 CSS px）
 *   --poi-leader-display     none / block
 *   --poi-leader-top / --poi-leader-height  导引线位置与高度
 * - 当 leaderMarkers 存在时，同步把导引线变量写入独立的低层级 marker
 *
 * 同时兼容两种布局：
 * - three.tsx：marker 为真实尺寸的流式 flex 布局
 * - recommendLine：marker 为 0×0 定位容器 + 绝对定位子元素
 * 横向中心统一取 icon 中心；纵向基准用 label.offsetTop（不含 transform），
 * 因此重复调用不会因上一次设置的 translateY 产生反馈漂移。
 * placement 默认为 above，Europe 小地图可显式传 below向节点下方堆叠。
 * 传入 bounds 时改为「图外栏位」模式：标签一律排到地图轮廓之外，重叠则继续向外堆叠；
 * 方向朝该 POI 横向区间上最近的那条轮廓边缘（也可用 placements 逐个覆盖）。
 */
export type LabelScreenRect = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export const POI_LABEL_COLLISION_PADDING = 4;
export const POI_LABEL_ABOVE_GAP = 28;
export const POI_LABEL_BELOW_GAP = 18;
export const POI_LABEL_STACK_GAP = 6;
export const POI_LABEL_MAX_LEVELS = 12;
/** 图外栏位模式下，标签与地图外接框之间的留白（布局 px） */
export const POI_LABEL_BOUNDS_GAP = 10;

export type PoiLabelPlacement = "above" | "below";

/**
 * client 坐标系（getBoundingClientRect 同系）下的边界。
 * map* 是地图整体的上下界，只用于 edgeAt 无解时兜底；view* 是画布，标签不得溢出。
 */
export type PoiLabelBounds = {
  mapBottom: number;
  mapTop: number;
  viewBottom: number;
  viewTop: number;
  /**
   * 查询横向区间 [left, right] 内地图轮廓的上下边界。
   * 标签按自己那一段的本地边界出图，避免统一排到全局最高/最低点导致连线过长。
   * 区间完全落在地图之外时返回 undefined。
   */
  edgeAt?: (
    left: number,
    right: number,
  ) => { bottom: number; top: number } | undefined;
};

export type PoiLabelCollisionOptions = {
  leaderMarkers?: Array<HTMLDivElement | null>;
  placement?: PoiLabelPlacement;
  /** 逐 POI 指定方向；缺省项按 bounds 自动判定，无 bounds 时回落到 placement */
  placements?: Array<PoiLabelPlacement | undefined>;
  bounds?: PoiLabelBounds;
};

function labelsOverlap(a: LabelScreenRect, b: LabelScreenRect) {
  return !(
    a.right + POI_LABEL_COLLISION_PADDING <= b.left ||
    a.left >= b.right + POI_LABEL_COLLISION_PADDING ||
    a.bottom + POI_LABEL_COLLISION_PADDING <= b.top ||
    a.top >= b.bottom + POI_LABEL_COLLISION_PADDING
  );
}

export function resolvePoiLabelCollisions(
  markers: Array<HTMLDivElement | null>,
  {
    leaderMarkers,
    placement = "above",
    placements,
    bounds,
  }: PoiLabelCollisionOptions = {},
) {
  const accepted: LabelScreenRect[] = [];

  markers.forEach((marker, markerIndex) => {
    if (!marker) return;

    const setMarkerProperty = (property: string, value: string) => {
      marker.style.setProperty(property, value);
      leaderMarkers?.[markerIndex]?.style.setProperty(property, value);
    };
    const setMarkerAttribute = (attribute: string, value: string) => {
      marker.setAttribute(attribute, value);
      leaderMarkers?.[markerIndex]?.setAttribute(attribute, value);
    };

    const icon = marker.querySelector<HTMLElement>("[data-poi-icon]");
    const label = marker.querySelector<HTMLElement>("[data-poi-label]");
    if (!icon || !label) return;

    const labelRect = label.getBoundingClientRect();
    // 标签尚未完成布局时跳过（替代原 marker.offsetWidth === 0 的守卫，
    // 兼容 0×0 的 PoiMarkerWrap）。
    if (labelRect.width === 0 || labelRect.height === 0) return;

    // CSS 缩放比：屏幕像素 / 布局像素（AutoFit 会对整页做 CSS 缩放）。
    // 用 label 自身宽度计算，兼容 marker 宽度为 0 的情况。
    const screenScale = labelRect.width / label.offsetWidth;
    if (!Number.isFinite(screenScale) || screenScale <= 0) return;

    const markerRect = marker.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const iconCenterX = iconRect.left + iconRect.width / 2;
    const iconTop = iconRect.top;
    // 基准位置：offsetTop 是布局偏移（不含 transform），无反馈漂移
    const baseTop = markerRect.top + label.offsetTop * screenScale;
    const width = label.offsetWidth * screenScale;
    const height = label.offsetHeight * screenScale;
    const baseLeft = iconCenterX - width / 2;

    // 出图基准：优先用标签自己那一段的本地轮廓边界（连线最短），
    // 该区间不覆盖地图时才退回全局上下界
    const localEdge = bounds?.edgeAt?.(baseLeft, baseLeft + width);
    const edgeTop = localEdge?.top ?? bounds?.mapTop ?? 0;
    const edgeBottom = localEdge?.bottom ?? bounds?.mapBottom ?? 0;

    // 方向：手动指定优先，其次朝最近的那条边出图
    const iconCenterY = iconRect.top + iconRect.height / 2;
    const autoPlacement: PoiLabelPlacement | undefined = bounds
      ? edgeBottom - iconCenterY <= iconCenterY - edgeTop
        ? "below"
        : "above"
      : undefined;
    const markerPlacement =
      placements?.[markerIndex] ?? autoPlacement ?? placement;
    const isBelow = markerPlacement === "below";

    const rectAt = (top: number): LabelScreenRect => ({
      bottom: top + height,
      left: baseLeft,
      right: baseLeft + width,
      top,
    });
    const levelStep =
      height + POI_LABEL_COLLISION_PADDING + POI_LABEL_STACK_GAP * screenScale;
    /** 第 level 级候选位置的 top，level 越大离节点/地图越远 */
    const candidateTopAt = (level: number) => {
      if (bounds) {
        const gutter = POI_LABEL_BOUNDS_GAP * screenScale;
        return isBelow
          ? edgeBottom + gutter + level * levelStep
          : edgeTop - gutter - height - level * levelStep;
      }
      return isBelow
        ? iconRect.bottom + POI_LABEL_BELOW_GAP * screenScale + level * levelStep
        : iconTop - height - POI_LABEL_ABOVE_GAP * screenScale - level * levelStep;
    };

    let candidate = rectAt(baseTop);
    let offsetY = 0;

    // 图外栏位模式下无论是否重叠都要挪出地图，否则沿用「原位不重叠就不动」
    if (bounds || accepted.some((other) => labelsOverlap(candidate, other))) {
      for (let level = 0; level < POI_LABEL_MAX_LEVELS; level += 1) {
        const candidateTop = candidateTopAt(level);
        const next = rectAt(candidateTop);
        const insideView =
          !bounds ||
          (next.top >= bounds.viewTop && next.bottom <= bounds.viewBottom);
        // 再往外就溢出画布了，退回上一级：宁可重叠也不要跑到屏幕外
        if (!insideView && level > 0) break;
        candidate = next;
        offsetY = (candidateTop - baseTop) / screenScale;
        if (!accepted.some((other) => labelsOverlap(candidate, other))) break;
      }
    }

    setMarkerAttribute("data-poi-direction", isBelow ? "bottom" : "top");
    setMarkerProperty("--poi-label-offset-y", `${offsetY}px`);
    if (offsetY !== 0) {
      const labelEdge = isBelow
        ? label.offsetTop + offsetY
        : label.offsetTop + offsetY + label.offsetHeight;
      const iconEdge = isBelow
        ? icon.offsetTop + icon.offsetHeight
        : icon.offsetTop;
      const leaderTop = isBelow ? iconEdge : labelEdge;
      const leaderHeight = Math.max(
        0,
        isBelow ? labelEdge - iconEdge : iconEdge - labelEdge,
      );
      setMarkerProperty("--poi-leader-display", "block");
      setMarkerProperty("--poi-leader-top", `${leaderTop}px`);
      setMarkerProperty("--poi-leader-height", `${leaderHeight}px`);
    } else {
      setMarkerProperty("--poi-leader-display", "none");
    }

    accepted.push(candidate);
  });
}
