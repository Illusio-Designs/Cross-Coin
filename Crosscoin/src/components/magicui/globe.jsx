"use client";

import createGlobe from "cobe";
import { useCallback, useEffect, useRef } from "react";

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const DARK_CONFIG = {
  width: 800,
  height: 800,
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 0.4,
  mapSamples: 20000,
  mapBrightness: 1.6,
  mapBaseBrightness: 0.05,
  baseColor: [0.1, 0.18, 0.32],
  markerColor: [0.18, 0.9, 0.55],
  glowColor: [0.05, 0.12, 0.28],
  scale: 1,
  offset: [0, 0],
  opacity: 1,
};

export default function Globe({
  className,
  config = {},
  markers = [],
  phi: fixedPhi = 0,
  theta: fixedTheta = 0.3,
}) {
  const canvasRef = useRef(null);
  const phiRef = useRef(fixedPhi);

  const pointerDown = useRef(false);
  const pointerStartX = useRef(0);
  const phiOnPointerDown = useRef(fixedPhi);

  useEffect(() => {
    phiRef.current = fixedPhi;
  }, [fixedPhi]);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const globe = createGlobe(canvasRef.current, {
      ...DARK_CONFIG,
      ...config,
      phi: phiRef.current,
      theta: fixedTheta,
      markers: markers.map((m) => ({
        location: m.location,
        size: m.size,
        ...(m.color ? { color: m.color } : {}),
      })),
      onRender: (state) => {
        // Static globe: no phi increment, only drag updates phiRef.
        state.phi = phiRef.current;
        state.theta = fixedTheta;
        state.markers = markers.map((m) => ({
          location: m.location,
          size: m.size,
          ...(m.color ? { color: m.color } : {}),
        }));
      },
    });

    return () => globe.destroy();
  }, [markers, fixedTheta, config]);

  const handlePointerDown = useCallback((e) => {
    pointerDown.current = true;
    pointerStartX.current = e.clientX;
    phiOnPointerDown.current = phiRef.current;
    e.target.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!pointerDown.current) return;
    const delta = (e.clientX - pointerStartX.current) / 300;
    phiRef.current = phiOnPointerDown.current + delta;
  }, []);

  const handlePointerUp = useCallback(() => {
    pointerDown.current = false;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn("cursor-grab active:cursor-grabbing", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ width: "100%", height: "100%", contain: "layout paint size" }}
    />
  );
}

