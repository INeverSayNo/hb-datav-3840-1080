import {
  useLayoutEffect,
  useState,
  type HTMLAttributes,
  type PropsWithChildren,
} from "react";
import styled from "styled-components";

import {
  ScreenLayoutContext,
  type ScreenLayout,
} from "@/hooks/useScreenLayout";

const Viewport = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #061821;
`;

const Stage = styled.div<{
  $designWidth: number;
  $designHeight: number;
  $scale: number;
}>`
  position: absolute;
  left: 50%;
  top: 50%;
  width: ${({ $designWidth }) => $designWidth}px;
  height: ${({ $designHeight }) => $designHeight}px;
  transform: translate(-50%, -50%) scale(${({ $scale }) => $scale});
  transform-origin: center;
  overflow: hidden;
`;

export type AutoFitProps = PropsWithChildren<
  Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    dw?: number;
    dh?: number;
    mode?: AutoFitMode;
    expandHeightMinWidth?: number;
  }
>;

export type AutoFitMode = "contain" | "expand-width" | "expand";

function getViewportSize() {
  return {
    width: document.documentElement.clientWidth || window.innerWidth,
    height: document.documentElement.clientHeight || window.innerHeight,
  };
}

function calculateLayout(
  dw: number,
  dh: number,
  mode: AutoFitMode,
  expandHeightMinWidth: number,
): ScreenLayout {
  const viewport = getViewportSize();
  const viewportAspect = viewport.width / Math.max(viewport.height, 1);
  const designAspect = dw / dh;
  const canExpandWidth = mode === "expand-width" || mode === "expand";
  const isUltraWide = canExpandWidth && viewportAspect > designAspect;
  const isTall =
    mode === "expand" &&
    viewportAspect < designAspect &&
    viewport.width >= expandHeightMinWidth;
  const scale = isUltraWide
    ? viewport.height / dh
    : isTall
      ? viewport.width / dw
      : Math.min(viewport.width / dw, viewport.height / dh);

  return {
    scale,
    stageWidth: isUltraWide ? viewport.width / Math.max(scale, 0.0001) : dw,
    stageHeight: isTall ? viewport.height / Math.max(scale, 0.0001) : dh,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    isUltraWide,
    isTall,
  };
}

export default function AutoFit({
  dw = 1920,
  dh = 1080,
  mode = "contain",
  expandHeightMinWidth = 0,
  children,
  ...props
}: AutoFitProps) {
  const [layout, setLayout] = useState<ScreenLayout>(() =>
    calculateLayout(dw, dh, mode, expandHeightMinWidth),
  );

  useLayoutEffect(() => {
    const updateLayout = () => {
      setLayout(calculateLayout(dw, dh, mode, expandHeightMinWidth));
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.visualViewport?.addEventListener("resize", updateLayout);
    return () => {
      window.removeEventListener("resize", updateLayout);
      window.visualViewport?.removeEventListener("resize", updateLayout);
    };
  }, [dw, dh, mode, expandHeightMinWidth]);

  return (
    <Viewport>
      <Stage
        $designWidth={layout.stageWidth}
        $designHeight={layout.stageHeight}
        $scale={layout.scale}
        {...props}>
        <ScreenLayoutContext.Provider value={layout}>
          {children}
        </ScreenLayoutContext.Provider>
      </Stage>
    </Viewport>
  );
}
