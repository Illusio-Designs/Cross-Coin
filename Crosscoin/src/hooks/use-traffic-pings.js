"use client";

import { useEffect, useRef, useState } from "react";

/**
 * @typedef {{lat:number,lng:number,type?:"active"|"checkout"}} VisitorLocation
 * @typedef {{location:[number,number],size:number,color?:[number,number,number]}} TrafficMarker
 */

/**
 * Converts visitor locations into pulsing cobe markers.
 * @param {VisitorLocation[]} visitors
 * @param {number} intervalMs
 * @returns {TrafficMarker[]}
 */
export default function useTrafficPings(visitors, intervalMs = 2000) {
  const [markers, setMarkers] = useState([]);
  const pingRef = useRef([]);
  const frameRef = useRef(0);

  useEffect(() => {
    pingRef.current = visitors.map((v, i) => ({
      id: `${v.lat.toFixed(2)},${v.lng.toFixed(2)}-${i}`,
      location: [v.lat, v.lng],
      size: 0.02,
      peakSize: v.type === "checkout" ? 0.1 : 0.06,
      color: v.type === "checkout" ? [1.0, 0.65, 0.15] : [0.18, 0.9, 0.55],
      born: Date.now() + i * 120,
    }));
  }, [visitors, intervalMs]);

  useEffect(() => {
    const PULSE_PERIOD = 1800;

    const tick = () => {
      const now = Date.now();
      const updated = pingRef.current.map((p) => {
        const age = (now - p.born) % PULSE_PERIOD;
        const t = age / PULSE_PERIOD;
        const size = p.peakSize * Math.abs(Math.sin(t * Math.PI));
        return {
          location: p.location,
          size: Math.max(0.01, size),
          color: p.color,
        };
      });

      setMarkers(updated);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return markers;
}

