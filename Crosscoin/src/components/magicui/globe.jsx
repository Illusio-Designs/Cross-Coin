import { useCallback, useEffect, useRef, useState } from "react";

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ─── Shopify-style globe config ───────────────────────────────────────────────
const BASE_CONFIG = {
  width: 900,
  height: 900,
  devicePixelRatio: 2,
  phi: 0.4,
  theta: 0.25,
  dark: 0,
  diffuse: 1.8,
  mapSamples: 24000,
  mapBrightness: 2.2,
  mapBaseBrightness: 0.08,
  baseColor: [0.88, 0.96, 1.0],       // light blue-white base
  markerColor: [0.25, 0.45, 1.0],     // blue visitor dots
  glowColor: [0.72, 0.88, 1.0],       // soft blue glow
  scale: 1,
  offset: [0, 0],
  opacity: 1,
};

export default function Globe({
  className,
  config = {},
  markers = [],
  arcs = [],
  phi: fixedPhi,
  theta: fixedTheta = 0.25,
  autoRotate = false,
  rotateSpeed = 0.003,
  scale = 1,
}) {
  const canvasRef    = useRef(null);
  const globeRef     = useRef(null);
  const phiRef       = useRef(fixedPhi ?? 0.4);
  const thetaRef     = useRef(fixedTheta);
  const scaleRef     = useRef(scale);
  const pointerDown  = useRef(false);
  const pointerStartX = useRef(0);
  const pointerStartY = useRef(0);
  const phiOnDown    = useRef(phiRef.current);
  const thetaOnDown  = useRef(thetaRef.current);

  // sync external phi/theta
  useEffect(() => { if (fixedPhi !== undefined) phiRef.current = fixedPhi; }, [fixedPhi]);
  useEffect(() => { thetaRef.current = fixedTheta; }, [fixedTheta]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    import("cobe").then(({ default: createGlobe }) => {
      if (destroyed) return;

      globeRef.current = createGlobe(canvasRef.current, {
        ...BASE_CONFIG,
        ...config,
        phi: phiRef.current,
        theta: thetaRef.current,
        scale: scaleRef.current,
        markers: markers.map(m => ({
          location: m.location,
          size: m.size,
          ...(m.color ? { color: m.color } : {}),
        })),
        onRender: (state) => {
          if (autoRotate && !pointerDown.current) {
            phiRef.current += rotateSpeed;
          }
          state.phi   = phiRef.current;
          state.theta = thetaRef.current;
          state.scale = scaleRef.current;
          state.markers = markers.map(m => ({
            location: m.location,
            size: m.size,
            ...(m.color ? { color: m.color } : {}),
          }));
        },
      });
    });

    return () => {
      destroyed = true;
      globeRef.current?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, autoRotate, rotateSpeed]);

  // ── Drag to rotate (both X and Y axis) ──
  const onPointerDown = useCallback((e) => {
    pointerDown.current  = true;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    phiOnDown.current    = phiRef.current;
    thetaOnDown.current  = thetaRef.current;
    e.target.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!pointerDown.current) return;
    const dx = (e.clientX - pointerStartX.current) / 250;
    const dy = (e.clientY - pointerStartY.current) / 250;
    phiRef.current   = phiOnDown.current   + dx;
    thetaRef.current = Math.max(-1.2, Math.min(1.2, thetaOnDown.current - dy));
  }, []);

  const onPointerUp = useCallback(() => { pointerDown.current = false; }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn("cursor-grab active:cursor-grabbing", className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ width: "100%", height: "100%", contain: "layout paint size" }}
    />
  );
}
