import { lazy, useLayoutEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router";
import { gsap } from "gsap";

const Index = lazy(() => import("./pages/Index/index"));
const Gallery = lazy(() => import("./pages/Gallery"));
const DataMonitory = lazy(()=>import("./pages/DataMonitor"))

function App() {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: 0.6,
          ease: "power3.out",
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [location.key]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        willChange: "transform, opacity",
      }}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/data-monitor" element={<DataMonitory />} />
      </Routes>
    </div>
  );
}

export default App;
