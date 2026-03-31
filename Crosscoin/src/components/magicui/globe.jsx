"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const GLOBE_CONFIG = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [],
};

export function Globe({ className, config = GLOBE_CONFIG }) {
  const canvasRef = useRef(null);
  const phiRef    = useRef(0);
  const widthRef  = useRef(0);
  const pointerInteracting = useRef(null);
  const pointerMovement    = useRef(0);
  // Simple spring: target and current
  const springTarget  = useRef(0);
  const springCurrent = useRef(0);

  useEffect(() => {
    const onResize = () => {
      if (canvasRef.current) widthRef.current = canvasRef.current.offsetWidth;
    };
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvasRef.current, {
      ...config,
      width:  widthRef.current * 2,
      height: widthRef.current * 2,
      onRender(state) {
        // Simple spring interpolation (replaces useSpring from motion)
        springCurrent.current += (springTarget.current - springCurrent.current) * 0.08;

        if (!pointerInteracting.current) phiRef.current += 0.005;
        state.phi    = phiRef.current + springCurrent.current;
        state.width  = widthRef.current * 2;
        state.height = widthRef.current * 2;
      },
    });

    setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = "1";
    }, 0);

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [config]);

  return (
    <div className={cn("absolute inset-0 mx-auto aspect-square w-full max-w-[600px]", className)}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", opacity: 0, transition: "opacity 0.5s" }}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX;
          if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerMovement.current = delta;
            springTarget.current = springTarget.current + delta / 1400;
            pointerInteracting.current = e.clientX;
          }
        }}
        onTouchMove={(e) => {
          if (e.touches[0] && pointerInteracting.current !== null) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            springTarget.current = springTarget.current + delta / 1400;
            pointerInteracting.current = e.touches[0].clientX;
          }
        }}
      />
    </div>
  );
}

export default Globe;
