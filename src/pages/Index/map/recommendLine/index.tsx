import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MOUSE, TOUCH, type PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import type { RecommendRoute } from "../../recommendLineRoutes";
import { useScaledCanvasDpr } from "@/hooks/useScreenLayout";
import { MapRoot, useControlSpeed } from "../threeShared";
import RecommendLineScene from "./Scene";
import { ENTER_DURATION } from "./constants";
import {
  cancelScheduledTextureRelease,
  getMotionDurations,
  prepareRoute,
  scheduleTextureRelease,
} from "./resources";
import XinjiangCoalLegend from "./components/XinjiangCoalLegend";

import { MapCanvasLayer } from "./styled";
import type {
  MapTransitionPhase,
  PreparedRoute,
  ProjectedRouteLayout,
} from "./types";

export type RecommendLineMapProps = {
  onReady?: () => void;
  onRouteTransitionEnd?: (route: RecommendRoute) => void;
  onRouteTransitionError?: (route: RecommendRoute) => void;
  /** 上层交叉淡入时标记为淡出层，冻结渲染循环。 */
  paused?: boolean;
  route: RecommendRoute;
};

function RecommendLineMap({
  onReady,
  onRouteTransitionEnd,
  onRouteTransitionError,
  paused = false,
  route,
}: RecommendLineMapProps) {
  const renderDpr = useScaledCanvasDpr();
  const controlSpeed = useControlSpeed();
  const controlsRef = useRef<OrbitControlsImpl>(null!);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const [prepared, setPrepared] = useState<PreparedRoute | null>(null);
  const preparedRef = useRef<PreparedRoute | null>(null);
  const [phase, setPhaseState] = useState<MapTransitionPhase>("hidden");
  const phaseRef = useRef<MapTransitionPhase>("hidden");
  const [transitionDuration, setTransitionDuration] = useState(ENTER_DURATION);
  const requestIdRef = useRef(0);
  const transitionTimerRef = useRef<number | null>(null);
  const transitionTargetRef = useRef<RecommendRoute | null>(null);
  const hasSignalledInitialReadyRef = useRef(false);

  const setPhase = useCallback((nextPhase: MapTransitionPhase) => {
    phaseRef.current = nextPhase;
    setPhaseState(nextPhase);
  }, []);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const applyCameraLayout = useCallback(
    (layout: ProjectedRouteLayout) => {
      const camera = cameraRef.current;
      if (!camera) return;
      const preset =
        route.camera ??
        (layout.viewMode === "world"
          ? {
              position: [0, 31, 9],
              fov: 32,
              target: [0, 0, 0],
            }
          : {
              position: [0, 31, 25.5],
              fov: 28.5,
              target: [0, 0, 0],
            });

      camera.position.set(...preset.position);
      camera.fov = preset.fov;
      camera.up.set(0, 1, 0);
      camera.updateProjectionMatrix();

      const controls = controlsRef.current;
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
        controls.saveState();
      } else {
        camera.lookAt(0, 0, 0);
      }
    },
    [route.camera],
  );

  useEffect(() => {
    // 重新挂载：取消上一次卸载时排定的贴图释放。
    cancelScheduledTextureRelease();
    return () => {
      requestIdRef.current += 1;
      clearTransitionTimer();
      // 离开精品线路视图后归还贴图显存；投影/布局缓存保留，重进无需重算。
      scheduleTextureRelease();
    };
  }, [clearTransitionTimer]);

  useEffect(() => {
    if (preparedRef.current?.layout.mapKey === route.mapKey) return;

    const requestId = ++requestIdRef.current;
    void prepareRoute(route)
      .then((nextPrepared) => {
        if (requestId !== requestIdRef.current) return;

        if (!preparedRef.current) {
          applyCameraLayout(nextPrepared.layout);
          preparedRef.current = nextPrepared;
          setPrepared(nextPrepared);
          setPhase("hidden");
          return;
        }

        transitionTargetRef.current = route;
        const durations = getMotionDurations();
        setTransitionDuration(durations.exit);
        setPhase("exiting");
        clearTransitionTimer();
        transitionTimerRef.current = window.setTimeout(() => {
          if (requestId !== requestIdRef.current) return;
          applyCameraLayout(nextPrepared.layout);
          preparedRef.current = nextPrepared;
          setPrepared(nextPrepared);
          setPhase("hidden");
          transitionTimerRef.current = null;
        }, durations.exit);
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        console.error(`精品线路“${route.label}”地图加载失败`, error);
        transitionTargetRef.current = null;
        onRouteTransitionError?.(route);
      });
  }, [
    applyCameraLayout,
    clearTransitionTimer,
    onRouteTransitionError,
    route,
    setPhase,
  ]);

  const handleSceneReady = useCallback(() => {
    if (phaseRef.current !== "hidden") return;

    const durations = getMotionDurations();
    setTransitionDuration(durations.enter);
    setPhase("entering");

    if (!hasSignalledInitialReadyRef.current) {
      hasSignalledInitialReadyRef.current = true;
      onReady?.();
    }

    const completedRoute = transitionTargetRef.current;
    clearTransitionTimer();
    transitionTimerRef.current = window.setTimeout(() => {
      setPhase("visible");
      transitionTimerRef.current = null;
      if (completedRoute) {
        transitionTargetRef.current = null;
        onRouteTransitionEnd?.(completedRoute);
      }
    }, durations.enter);
  }, [clearTransitionTimer, onReady, onRouteTransitionEnd, setPhase]);

  const cameraBounds =
    route.camera ??
    (prepared?.layout.viewMode === "world"
      ? {
          minDistance: 20,
          maxDistance: 100,
          minPolarAngle: 0.08,
          maxPolarAngle: 1.05,
          minAzimuthAngle: -1.2,
          maxAzimuthAngle: 1.2,
        }
      : {
          minDistance: 14,
          maxDistance: 70,
          minPolarAngle: 0.3,
          maxPolarAngle: 1.35,
          minAzimuthAngle: -0.9,
          maxAzimuthAngle: 0.9,
        });

  const showXinjiangCoalLegend = useMemo(
    () => route.label === "疆煤入鄂",
    [route],
  );


  return (
    <MapRoot role="img" aria-label="精品线路覆盖省份三维地形地图">
      {showXinjiangCoalLegend && <XinjiangCoalLegend />}

      <MapCanvasLayer
        $duration={transitionDuration}
        $phase={phase}
        aria-busy={phase !== "visible"}
      >
        <Canvas
          dpr={renderDpr}
          resize={{ offsetSize: true }}
          frameloop={paused || phase === "exiting" ? "demand" : "always"}
          gl={{ alpha: true, antialias: true }}
          camera={{
            fov: 28.5,
            near: 0.1,
            far: 360,
            position: [0, 31, 25.5],
          }}
          onCreated={({ camera }) => {
            cameraRef.current = camera as PerspectiveCamera;
            if (prepared) {
              applyCameraLayout(prepared.layout);
            }
          }}
        >
          <Suspense fallback={null}>
            {prepared && (
              <group rotation={[-Math.PI / 2, 0, 0]}>
                <RecommendLineScene
                  prepared={prepared}
                  onReady={handleSceneReady}
                  route={route}
                />
              </group>
            )}
          </Suspense>
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan
            enableZoom
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={controlSpeed}
            panSpeed={controlSpeed}
            zoomSpeed={0.9}
            minDistance={cameraBounds.minDistance}
            maxDistance={cameraBounds.maxDistance}
            minPolarAngle={cameraBounds.minPolarAngle}
            maxPolarAngle={cameraBounds.maxPolarAngle}
            minAzimuthAngle={cameraBounds.minAzimuthAngle}
            maxAzimuthAngle={cameraBounds.maxAzimuthAngle}
            screenSpacePanning={false}
            zoomToCursor
            mouseButtons={{
              LEFT: MOUSE.PAN,
              MIDDLE: MOUSE.DOLLY,
              RIGHT: MOUSE.ROTATE,
            }}
            touches={{
              ONE: TOUCH.PAN,
              TWO: TOUCH.DOLLY_ROTATE,
            }}
          />
        </Canvas>
      </MapCanvasLayer>
    </MapRoot>
  );
}

RecommendLineMap.preload = (route: RecommendRoute) => {
  // 预加载意味着马上还要用，取消排定中的释放，避免刚载入就被丢弃。
  cancelScheduledTextureRelease();
  return prepareRoute(route).then(() => undefined);
};

export default RecommendLineMap;
