import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import styled from "styled-components";

const Frame = styled.div<{ $borderColor: string }>`
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 2px solid ${({ $borderColor }) => $borderColor};
  background: rgba(3, 24, 33, 0.72);
`;

const Header = styled.div<{ $background: string; $height: number }>`
  display: flex;
  align-items: center;
  height: ${({ $height }) => $height}px;
  padding: 0 42px;
  color: #d8edf5;
  background: ${({ $background }) => $background};
  font-size: 39px;
  font-weight: 700;
  letter-spacing: 2px;
`;

const Viewport = styled.div<{ $height: number }>`
  height: ${({ $height }) => $height}px;
  overflow: hidden;
`;

const Track = styled.div<{
  $animating: boolean;
  $direction: "up" | "down";
  $rowHeight: number;
  $duration: number;
}>`
  transform: translate3d(
    0,
    ${({ $animating, $direction, $rowHeight }) => {
      if ($direction === "down") return $animating ? 0 : -$rowHeight;
      return $animating ? -$rowHeight : 0;
    }}px,
    0
  );
  transition: ${({ $animating, $duration }) =>
    $animating ? `transform ${$duration}ms ease-in-out` : "none"};
  will-change: transform;
`;

const Row = styled.div<{ $height: number; $padding: string }>`
  display: flex;
  align-items: center;
  height: ${({ $height }) => $height}px;
  margin: ${({ $padding }) => $padding};
  // border-bottom: 4px solid rgba(19, 117, 128, 0.58);
  color: #afc3cc;
  font-size: 36px;
  letter-spacing: 1px;
  will-change: transform;
`;

const Cell = styled.div<{
  $width: number;
  $align: "left" | "center" | "right";
}>`
  flex: ${({ $width }) => $width} 1 0;
  min-width: 0;
  overflow: hidden;
  text-align: ${({ $align }) => $align};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Empty = styled.div`
  display: grid;
  place-items: center;
  height: 100%;
  color: rgba(151, 187, 200, 0.66);
  font-size: 36px;
`;

export interface LoopingTableColumn<T> {
  title?: ReactNode;
  width?: number;
  align?: "left" | "center" | "right";
  dataIndex?: keyof T;
  render?: (item: T) => ReactNode;
}

interface LoopingTableProps<T extends { id: string }> {
  data: T[];
  columns: LoopingTableColumn<T>[];
  visibleRows: number;
  rowHeight?: number;
  headerHeight?: number;
  showHeader?: boolean;
  interval?: number;
  duration?: number;
  scrollDirection?: "up" | "down";
  startDelay?: number;
  borderColor?: string;
  headerBackground?: string;
  rowPadding?: string;
  rowStyle?: CSSProperties;
}

function findSurvivingAnchor<T extends { id: string }>(
  anchorId: string | undefined,
  previousIds: string[],
  data: T[],
  direction: "up" | "down",
) {
  if (anchorId && data.some((item) => item.id === anchorId)) return anchorId;
  if (anchorId) {
    const oldIndex = previousIds.indexOf(anchorId);
    if (oldIndex !== -1) {
      const step = direction === "down" ? -1 : 1;
      for (let offset = 1; offset <= previousIds.length; offset += 1) {
        const candidateIndex =
          (oldIndex + step * offset + previousIds.length) %
          previousIds.length;
        const candidate = previousIds[candidateIndex];
        if (data.some((item) => item.id === candidate)) return candidate;
      }
    }
  }
  return data[0]?.id;
}

export default function LoopingTable<T extends { id: string }>({
  data,
  columns,
  visibleRows,
  rowHeight = 96,
  headerHeight = 92,
  showHeader = true,
  interval = 3000,
  duration = 300,
  scrollDirection = "up",
  startDelay = 0,
  borderColor = "rgba(9, 105, 118, 0.88)",
  headerBackground = "rgba(5, 83, 96, 0.92)",
  rowPadding = "0 42px",
  rowStyle,
}: LoopingTableProps<T>) {
  const previousIdsRef = useRef<string[]>([]);
  const dataRef = useRef(data);
  const hasStartedRef = useRef(false);
  const [anchorId, setAnchorId] = useState<string | undefined>(
    () => data[0]?.id,
  );
  const [animating, setAnimating] = useState(false);
  dataRef.current = data;

  const resolvedAnchorId = findSurvivingAnchor(
    anchorId,
    previousIdsRef.current,
    data,
    scrollDirection,
  );
  const shouldScroll = data.length > visibleRows;

  useLayoutEffect(() => {
    if (resolvedAnchorId !== anchorId) setAnchorId(resolvedAnchorId);
    previousIdsRef.current = data.map((item) => item.id);
    if (!shouldScroll && animating) setAnimating(false);
  }, [anchorId, animating, data, resolvedAnchorId, shouldScroll]);

  useEffect(() => {
    if (!shouldScroll || animating) return;
    const delay = interval + (hasStartedRef.current ? 0 : startDelay);
    const timer = window.setTimeout(() => {
      hasStartedRef.current = true;
      setAnimating(true);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [animating, interval, shouldScroll, startDelay]);

  const rows = useMemo(() => {
    if (!data.length) return [];
    const anchorIndex = Math.max(
      0,
      data.findIndex((item) => item.id === resolvedAnchorId),
    );
    const count = shouldScroll ? visibleRows + 1 : data.length;
    const start =
      shouldScroll && scrollDirection === "down"
        ? (anchorIndex - 1 + data.length) % data.length
        : anchorIndex;
    return Array.from({ length: count }, (_, index) =>
      data[(start + index) % data.length],
    );
  }, [data, resolvedAnchorId, scrollDirection, shouldScroll, visibleRows]);

  const handleTransitionEnd = () => {
    if (!animating) return;
    const current = dataRef.current;
    const currentIndex = current.findIndex(
      (item) => item.id === resolvedAnchorId,
    );
    const step = scrollDirection === "down" ? -1 : 1;
    const next =
      current.length > 0
        ? current[
            (Math.max(0, currentIndex) + step + current.length) %
              current.length
          ]
        : undefined;
    setAnchorId(next?.id);
    setAnimating(false);
  };

  return (
    <Frame $borderColor={borderColor}>
      {showHeader && (
        <Header $background={headerBackground} $height={headerHeight}>
          {columns.map((column, index) => (
            <Cell
              key={index}
              $width={column.width ?? 1}
              $align={column.align ?? "left"}
            >
              {column.title}
            </Cell>
          ))}
        </Header>
      )}
      <Viewport $height={rowHeight * visibleRows}>
        {rows.length ? (
          <Track
            $animating={animating && shouldScroll}
            $direction={shouldScroll ? scrollDirection : "up"}
            $rowHeight={rowHeight}
            $duration={duration}
            onTransitionEnd={handleTransitionEnd}
          >
            {rows.map((item) => (
              <Row
                key={item.id}
                $height={rowHeight}
                $padding={rowPadding}
                style={rowStyle}
              >
                {columns.map((column, index) => {
                  const value = column.dataIndex
                    ? item[column.dataIndex]
                    : undefined;
                  return (
                    <Cell
                      key={index}
                      $width={column.width ?? 1}
                      $align={column.align ?? "left"}
                    >
                      {column.render?.(item) ?? String(value ?? "--")}
                    </Cell>
                  );
                })}
              </Row>
            ))}
          </Track>
        ) : (
          <Empty>暂无数据</Empty>
        )}
      </Viewport>
    </Frame>
  );
}
