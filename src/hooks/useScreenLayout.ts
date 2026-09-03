import { createContext, useContext } from "react";

export interface ScreenLayout {
  scale: number;
  stageWidth: number;
  stageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  isUltraWide: boolean;
  isTall: boolean;
}

export const ScreenLayoutContext = createContext<ScreenLayout | null>(null);

export function useScreenLayout() {
  const layout = useContext(ScreenLayoutContext);

  if (!layout) {
    throw new Error("useScreenLayout 必须在 AutoFit 内部使用");
  }

  return layout;
}

export function useScaledCanvasDpr(min = 0.5, max = 1.5) {
  const { scale } = useScreenLayout();
  const deviceDpr = window.devicePixelRatio || 1;

  return Math.min(max, Math.max(min, deviceDpr * scale));
}
