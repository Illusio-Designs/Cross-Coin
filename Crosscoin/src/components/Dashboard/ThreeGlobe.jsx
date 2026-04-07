import { useEffect, useRef, useState } from "react";
import indiaMap from "@svg-maps/india";

const CITY_SVG = {
  "mumbai":          { x: 152, y: 430, name: "Mumbai" },
  "delhi":           { x: 195, y: 195, name: "Delhi" },
  "bangalore":       { x: 218, y: 548, name: "Bangalore" },
  "bengaluru":       { x: 218, y: 548, name: "Bengaluru" },
  "chennai":         { x: 268, y: 545, name: "Chennai" },
  "hyderabad":       { x: 245, y: 468, name: "Hyderabad" },
  "kolkata":         { x: 378, y: 338, name: "Kolkata" },
  "pune":            { x: 168, y: 445, name: "Pune" },
  "ahmedabad":       { x: 138, y: 348, name: "Ahmedabad" },
  "jaipur":          { x: 178, y: 248, name: "Jaipur" },
  "lucknow":         { x: 258, y: 238, name: "Lucknow" },
  "surat":           { x: 138, y: 388, name: "Surat" },
  "rajkot":          { x: 108, y: 358, name: "Rajkot" },
  "bhopal":          { x: 218, y: 338, name: "Bhopal" },
  "indore":          { x: 195, y: 345, name: "Indore" },
  "nagpur":          { x: 255, y: 368, name: "Nagpur" },
  "patna":           { x: 308, y: 278, name: "Patna" },
  "vadodara":        { x: 148, y: 368, name: "Vadodara" },
  "coimbatore":      { x: 225, y: 578, name: "Coimbatore" },
  "kochi":           { x: 208, y: 598, name: "Kochi" },
  "chandigarh":      { x: 195, y: 158, name: "Chandigarh" },
  "gurgaon":         { x: 198, y: 198, name: "Gurgaon" },
  "noida":           { x: 205, y: 195, name: "Noida" },
  "visakhapatnam":   { x: 298, y: 468, name: "Visakhapatnam" },
  "agra":            { x: 215, y: 218, name: "Agra" },
  "varanasi":        { x: 278, y: 258, name: "Varanasi" },
  "nashik":          { x: 162, y: 418, name: "Nashik" },
  "aurangabad":      { x: 185, y: 428, name: "Aurangabad" },
  "amritsar":        { x: 175, y: 138, name: "Amritsar" },
  "jodhpur":         { x: 148, y: 268, name: "Jodhpur" },
  "srinagar":        { x: 185, y: 88,  name: "Srinagar" },
  "guwahati":        { x: 418, y: 278, name: "Guwahati" },
  "thane":           { x: 155, y: 432, name: "Thane" },
  "madurai":         { x: 245, y: 598, name: "Madurai" },
  "vijayawada":      { x: 275, y: 488, name: "Vijayawada" },
  "bhubaneswar":     { x: 318, y: 408, name: "Bhubaneswar" },
  "raipur":          { x: 278, y: 378, name: "Raipur" },
  "udaipur":         { x: 158, y: 298, name: "Udaipur" },
  "ludhiana":        { x: 185, y: 148, name: "Ludhiana" },
  "kanpur":          { x: 248, y: 248, name: "Kanpur" },
  "dehradun":        { x: 215, y: 168, name: "Dehradun" },
  "salem":           { x: 238, y: 568, name: "Salem" },
  "tirupati":        { x: 258, y: 518, name: "Tirupati" },
};

function resolveCity(marker) {
  const tryKey = (k) => {
    if (!k) return null;
    const key = k.toLowerCase().trim();
    if (CITY_SVG[key]) return CITY_SVG[key];
    const found = Object.keys(CITY_SVG).find(ck => ck.includes(key) || key.includes(ck));
    return found ? CITY_SVG[found] : null;
  };
  const fromCity = tryKey(marker.city);
  if (fromCity) return fromCity;
  const lat = marker.lat ?? marker.location?.[0];
  const lng = marker.lng ?? marker.location?.[1];
  if (lat != null && lng != null) {
    return { x: ((lng - 68) / 29) * 480 + 80, y: ((37 - lat) / 29) * 620 + 40, name: marker.city || "" };
  }
  return null;
}

export default function ThreeGlobe({ markersRef: externalMarkersRef }) {
  const [activeMarkers, setActiveMarkers] = useState([]);
  const [hoveredCity, setHoveredCity]     = useState(null);
  const [scanY, setScanY]                 = useState(0);
  const [zoom, setZoom]                   = useState(1);
  const [pan, setPan]                     = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart  = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const prevRef    = useRef(null);

  // Realtime marker polling
  useEffect(() => {
    const check = () => {
      const current = externalMarkersRef?.current;
      if (current === prevRef.current) return;
      prevRef.current = current;
      if (!current || current.length === 0) { setActiveMarkers([]); return; }
      const grouped = {};
      current.forEach(m => {
        const r = resolveCity(m);
        if (!r) return;
        const key = r.name || `${r.x},${r.y}`;
        const cnt = m.count || 1;
        if (grouped[key]) grouped[key].count += cnt;
        else grouped[key] = { ...r, count: cnt };
      });
      setActiveMarkers(Object.values(grouped));
    };
    check();
    const id = setInterval(check, 500);
    return () => clearInterval(id);
  }, [externalMarkersRef]);

  // Scan line
  useEffect(() => {
    let frame, y = 0;
    const tick = () => { y = (y + 0.8) % 696; setScanY(y); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Zoom / pan
  const zoomIn  = () => setZoom(z => Math.min(+(z + 0.3).toFixed(1), 4));
  const zoomOut = () => setZoom(z => { const n = Math.max(+(z - 0.3).toFixed(1), 1); if (n === 1) setPan({ x: 0, y: 0 }); return n; });
  const reset   = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const onMouseDown = (e) => { if (zoom <= 1) return; isDragging.current = true; dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; };
  const onMouseMove = (e) => { if (!isDragging.current) return; setPan({ x: dragStart.current.px + e.clientX - dragStart.current.x, y: dragStart.current.py + e.clientY - dragStart.current.y }); };
  const onMouseUp   = () => { isDragging.current = false; };

  const states = indiaMap.locations.filter(l => !["an", "ld"].includes(l.id));

  return (
    <div
      style={{
        width: "100%", height: "100%",
        background: "#ffffff",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        cursor: zoom > 1 ? (isDragging.current ? "grabbing" : "grab") : "default",
        userSelect: "none",
      }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
    >
      {/* Subtle bg pattern */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(109,74,255,0.04) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        pointerEvents: "none",
      }}/>

      {/* Zoom controls — fixed to top-right corner of the map container */}
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 4, zIndex: 20, pointerEvents: "all" }}>
        {[{ l: "+", fn: zoomIn, t: "Zoom in" }, { l: "−", fn: zoomOut, t: "Zoom out" }, { l: "⊙", fn: reset, t: "Reset" }].map(b => (
          <button key={b.l} onClick={b.fn} title={b.t} style={{
            width: 30, height: 30, borderRadius: 7, border: "1px solid rgba(109,74,255,0.25)",
            background: "rgba(255,255,255,0.9)", color: "#4c1d95", fontSize: 16, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(6px)", lineHeight: 1, boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(109,74,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.9)"}
          >{b.l}</button>
        ))}
        {zoom > 1 && (
          <div style={{ fontSize: 9, color: "rgba(0,0,0,0.4)", textAlign: "center", fontFamily: "Arial,sans-serif", marginTop: 2 }}>
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>

      <svg
        viewBox={indiaMap.viewBox}
        style={{
          width: "auto", height: "94%", maxWidth: "100%",
          filter: "drop-shadow(0 2px 12px rgba(109,74,255,0.15))",
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: "center center",
          transition: isDragging.current ? "none" : "transform 0.2s ease",
          position: "relative", zIndex: 1,
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="sg" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="mg" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <linearGradient id="sf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ede9fe" stopOpacity="1"/>
            <stop offset="100%" stopColor="#ddd6fe" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="af" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#CE1E36" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#CE1E36" stopOpacity="0.08"/>
          </linearGradient>
          <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(109,74,255,0)"/>
            <stop offset="50%" stopColor="rgba(109,74,255,0.08)"/>
            <stop offset="100%" stopColor="rgba(109,74,255,0)"/>
          </linearGradient>
          <clipPath id="ic">{states.map(s => <path key={s.id} d={s.path}/>)}</clipPath>
        </defs>

        {/* States */}
        {states.map(s => {
          const active = activeMarkers.some(m => m.name && s.name.toLowerCase().includes(m.name.toLowerCase().split(" ")[0]));
          return (
            <path key={s.id} d={s.path}
              fill={active ? "url(#af)" : "url(#sf)"}
              stroke={active ? "rgba(206,30,54,0.6)" : "rgba(109,74,255,0.35)"}
              strokeWidth={active ? "1.2" : "0.6"}
              strokeLinejoin="round" filter="url(#sg)"
              style={{ transition: "all 0.4s ease" }}
            />
          );
        })}

        {/* Scan line */}
        <rect x="0" y={scanY - 30} width="612" height="60" fill="url(#scan)" clipPath="url(#ic)" style={{ pointerEvents: "none" }}/>

        {/* City dots with tooltip */}
        {Object.values(CITY_SVG).map((c, i) => (
          <g key={i} onMouseEnter={() => setHoveredCity(c.name)} onMouseLeave={() => setHoveredCity(null)} style={{ cursor: "default" }}>
            <circle cx={c.x} cy={c.y} r="5" fill="transparent"/>
            <circle cx={c.x} cy={c.y} r="2" fill="#7c3aed" opacity={hoveredCity === c.name ? 1 : 0.5}/>
            {hoveredCity === c.name && (
              <g>
                <rect x={c.x + 5} y={c.y - 14} width={c.name.length * 5.5 + 10} height="13" rx="3" fill="rgba(24,13,62,0.92)" stroke="rgba(109,74,255,0.6)" strokeWidth="0.6"/>
                <text x={c.x + 10} y={c.y - 4} fontSize="8" fontFamily="Arial,sans-serif" fill="#c4b5fd">{c.name}</text>
              </g>
            )}
          </g>
        ))}

        {/* Active markers */}
        {activeMarkers.map((m, i) => {
          // Alternate label above/below to avoid overlap with nearby markers
          const labelAbove = i % 2 === 0;
          const labelText = m.count > 1 ? `${m.name}  ×${m.count}` : m.name;
          const charW = 6.2;
          const padding = 16;
          const fw = labelText.length * charW + padding;
          const lx = m.x - fw / 2; // center label on dot
          const ly = labelAbove ? m.y - 28 : m.y + 12;

          return (
            <g key={`${m.name}-${i}`} filter="url(#mg)">
              {/* Pulse rings */}
              <circle cx={m.x} cy={m.y} r="6" fill="none" stroke="#CE1E36" strokeWidth="1.5">
                <animate attributeName="r" values="6;26" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx={m.x} cy={m.y} r="6" fill="none" stroke="#CE1E36" strokeWidth="1">
                <animate attributeName="r" values="6;26" dur="2s" begin="0.7s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.5;0" dur="2s" begin="0.7s" repeatCount="indefinite"/>
              </circle>
              {/* Dot */}
              <circle cx={m.x} cy={m.y} r="5" fill="#CE1E36"/>
              <circle cx={m.x} cy={m.y} r="2" fill="#fff"/>
              {/* Connector line from dot to label */}
              <line
                x1={m.x} y1={labelAbove ? m.y - 6 : m.y + 6}
                x2={m.x} y2={labelAbove ? ly + 14 : ly}
                stroke="#CE1E36" strokeWidth="1" strokeDasharray="2,2" opacity="0.5"
              />
              {/* Label pill — centered on dot */}
              {m.name && (
                <g transform={`translate(${lx},${ly})`}>
                  <rect x="0" y="0" width={fw} height="15" rx="4" fill="#CE1E36"/>
                  <text x={fw / 2} y="10.5" fontSize="8.5" fontFamily="Arial,sans-serif" fontWeight="bold" fill="#fff" textAnchor="middle">{labelText}</text>
                </g>
              )}
            </g>
          );
        })}

        {activeMarkers.length === 0 && (
          <text x="306" y="360" textAnchor="middle" fontSize="14" fill="rgba(0,0,0,0.2)" fontFamily="Arial,sans-serif">No active visitors</text>
        )}
      </svg>

      <style>{`@keyframes lp{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}`}</style>
    </div>
  );
}
