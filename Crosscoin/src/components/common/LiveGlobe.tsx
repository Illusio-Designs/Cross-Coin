import { useEffect, useRef, useState, useCallback } from "react";
import createGlobe from "cobe";
import type { COBEOptions } from "cobe";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Visitor {
  lat: number;
  lng: number;
  id: string;
}

interface OrderPing {
  lat: number;
  lng: number;
  id: string;
  createdAt: number;
}

interface TrafficArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [number, number, number, number];
}

interface TopLocation {
  city: string;
  country: string;
  activeUsers: number;
}

interface GA4RealtimeResponse {
  minuteRanges?: { startMinutesAgo: string; endMinutesAgo: string }[];
  rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[];
  totals?: { metricValues: { value: string }[] }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Map city name → [lat, lng] — expand as needed
const CITY_COORDS: Record<string, [number, number]> = {
  Mumbai: [19.076, 72.877],
  Delhi: [28.613, 77.209],
  Bangalore: [12.971, 77.594],
  Chennai: [13.082, 80.27],
  Hyderabad: [17.385, 78.487],
  Pune: [18.52, 73.857],
  Kolkata: [22.572, 88.363],
  Ahmedabad: [23.022, 72.571],
  Surat: [21.17, 72.831],
  Rajkot: [22.303, 70.802],
  London: [51.507, -0.128],
  "New York": [40.714, -74.006],
  "Los Angeles": [34.052, -118.244],
  Toronto: [43.651, -79.347],
  Sydney: [-33.868, 151.209],
  Dubai: [25.204, 55.27],
  Singapore: [1.352, 103.82],
  "Kuala Lumpur": [3.139, 101.687],
};

const CROSSCOIN_HQ: [number, number] = [22.303, 70.802]; // Rajkot

function cityToCoords(city: string): [number, number] | null {
  return CITY_COORDS[city] ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LiveGlobeProps {
  /** GA4 Property ID — e.g. "properties/123456789" */
  propertyId: string;
  /** Bearer token from Google OAuth2 / Service Account */
  accessToken: string;
  /** Poll interval in ms (default 30 000) */
  pollInterval?: number;
}

export default function LiveGlobe({
  propertyId,
  accessToken,
  pollInterval = 30_000,
}: LiveGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const phiRef = useRef(0);
  const arcsRef = useRef<TrafficArc[]>([]);
  const markersRef = useRef<{ location: [number, number]; size: number }[]>([]);

  const [topLocations, setTopLocations] = useState<TopLocation[]>([]);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0); // injected via your backend
  const [orderPings, setOrderPings] = useState<OrderPing[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ── Fetch GA4 real-time data ──────────────────────────────────────────────

  const fetchGA4 = useCallback(async () => {
    if (!accessToken) return; // wait until token is available
    try {
      const body = {
        dimensions: [{ name: "city" }, { name: "country" }],
        metrics: [{ name: "activeUsers" }],
        minuteRanges: [{ name: "0-5", startMinutesAgo: 5, endMinutesAgo: 0 }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 20,
      };

      const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runRealtimeReport`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        console.warn("[LiveGlobe] GA4 fetch failed:", res.status);
        return;
      }

      const data: GA4RealtimeResponse = await res.json();
      const rows = data.rows ?? [];

      // Build top locations list
      const locations: TopLocation[] = rows.slice(0, 8).map((row) => ({
        city: row.dimensionValues[0]?.value ?? "Unknown",
        country: row.dimensionValues[1]?.value ?? "",
        activeUsers: parseInt(row.metricValues[0]?.value ?? "0", 10),
      }));
      setTopLocations(locations);

      // Total active users
      const total = rows.reduce(
        (acc, r) => acc + parseInt(r.metricValues[0]?.value ?? "0", 10),
        0
      );
      setTotalVisitors(total);

      // Build globe markers from cities that have coordinates
      const newMarkers: { location: [number, number]; size: number }[] = [];
      const newArcs: TrafficArc[] = [];

      for (const row of rows) {
        const city = row.dimensionValues[0]?.value ?? "";
        const users = parseInt(row.metricValues[0]?.value ?? "0", 10);
        const coords = cityToCoords(city);
        if (!coords) continue;

        // marker size proportional to users
        newMarkers.push({
          location: coords,
          size: Math.min(0.04 + users * 0.002, 0.08),
        });

        // draw arc from HQ → city (traffic origin illusion)
        if (
          coords[0] !== CROSSCOIN_HQ[0] ||
          coords[1] !== CROSSCOIN_HQ[1]
        ) {
          newArcs.push({
            startLat: CROSSCOIN_HQ[0],
            startLng: CROSSCOIN_HQ[1],
            endLat: coords[0],
            endLng: coords[1],
            color: [0.2, 0.8, 0.6, 0.7],
          });
        }
      }

      // Always include HQ marker
      newMarkers.push({ location: CROSSCOIN_HQ, size: 0.05 });

      markersRef.current = newMarkers;
      arcsRef.current = newArcs;
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error("[LiveGlobe] Error fetching GA4:", err);
      setLoading(false);
    }
  }, [propertyId, accessToken]);

  // ── Simulate order pings (replace with your WebSocket / API) ─────────────

  const simulateOrderPing = useCallback(() => {
    const cities = Object.entries(CITY_COORDS);
    const [, coords] =
      cities[Math.floor(Math.random() * cities.length)];
    const ping: OrderPing = {
      lat: coords[0],
      lng: coords[1],
      id: Math.random().toString(36).slice(2),
      createdAt: Date.now(),
    };
    setOrderPings((prev) => [...prev.slice(-19), ping]);
    setTotalOrders((n) => n + 1);

    // Expire ping after 3 s
    setTimeout(() => {
      setOrderPings((prev) => prev.filter((p) => p.id !== ping.id));
    }, 3000);
  }, []);

  // ── Mount globe ──────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let globe: ReturnType<any> | null = null;

    let rafId: number;

    import("cobe").then(({ default: createGlobe }) => {
      if (!canvasRef.current) return;
      const config: COBEOptions = {
        devicePixelRatio: 2,
        width: canvas.offsetWidth * 2,
        height: canvas.offsetHeight * 2,
        phi: 1.4,
        theta: 0.2,
        dark: 1,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 6,
        baseColor: [0.06, 0.08, 0.14],
        markerColor: [0.2, 0.9, 0.65],
        glowColor: [0.12, 0.2, 0.35],
        markers: markersRef.current,
      };
      globe = createGlobe(canvas, config);
      globeRef.current = globe;

      // v2 API: drive rotation via requestAnimationFrame + globe.update()
      const animate = () => {
        phiRef.current += 0.003;
        globe?.update({ phi: phiRef.current, markers: markersRef.current });
        rafId = requestAnimationFrame(animate);
      };
      rafId = requestAnimationFrame(animate);
    });

    return () => {
      cancelAnimationFrame(rafId);
      globe?.destroy();
      globeRef.current = null;
    };
  }, []);

  // ── Data polling ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchGA4();
    const timer = setInterval(fetchGA4, pollInterval);
    return () => clearInterval(timer);
  }, [fetchGA4, pollInterval]);

  // Demo: simulate an order every 8–20 s
  useEffect(() => {
    function schedule() {
      const delay = 8000 + Math.random() * 12000;
      return setTimeout(() => {
        simulateOrderPing();
        schedule();
      }, delay);
    }
    const t = schedule();
    return () => clearTimeout(t);
  }, [simulateOrderPing]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="live-globe-wrapper">
      {/* ── Stats bar ── */}
      <div className="stats-bar">
        <StatCard
          label="Active visitors"
          value={loading ? "—" : totalVisitors.toLocaleString()}
          accent="#22e5a0"
        />
        <StatCard
          label="Orders today"
          value={totalOrders.toLocaleString()}
          accent="#5b9dff"
        />
        <div className="last-updated">
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString()}`
            : "Connecting…"}
        </div>
      </div>

      {/* ── Globe + sidebar ── */}
      <div className="globe-layout">
        {/* Globe */}
        <div className="globe-container">
          <canvas ref={canvasRef} className="globe-canvas" />

          {/* Order pings overlay */}
          {orderPings.map((ping) => (
            <div key={ping.id} className="order-ping">
              <span className="ping-label">🧦 Order placed</span>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <aside className="sidebar">
          <p className="sidebar-heading">Top locations</p>
          {loading ? (
            <div className="skeleton-list">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton-row" />
              ))}
            </div>
          ) : topLocations.length === 0 ? (
            <p className="no-data">No data yet</p>
          ) : (
            <ul className="location-list">
              {topLocations.map((loc, i) => (
                <li key={i} className="location-row">
                  <div className="location-meta">
                    <span className="location-rank">{i + 1}</span>
                    <span className="location-city">{loc.city}</span>
                    <span className="location-country">{loc.country}</span>
                  </div>
                  <div className="location-bar-wrap">
                    <div
                      className="location-bar"
                      style={{
                        width: `${Math.min(
                          100,
                          (loc.activeUsers /
                            Math.max(topLocations[0]?.activeUsers ?? 1, 1)) *
                            100
                        )}%`,
                      }}
                    />
                    <span className="location-count">
                      {loc.activeUsers.toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <style>{`
        .live-globe-wrapper {
          background: #080c14;
          border-radius: 16px;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #e2e8f0;
          user-select: none;
        }

        /* Stats bar */
        .stats-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px 0;
        }
        .stat-card {
          background: rgba(255,255,255,0.04);
          border: 0.5px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 10px 16px;
          min-width: 140px;
        }
        .stat-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 22px;
          font-weight: 600;
          line-height: 1;
        }
        .last-updated {
          margin-left: auto;
          font-size: 11px;
          color: #334155;
        }

        /* Globe layout */
        .globe-layout {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 8px 0 0;
        }

        .globe-container {
          position: relative;
          flex: 1;
          min-height: 380px;
          max-height: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .globe-canvas {
          width: 100%;
          height: 100%;
          max-height: 480px;
          aspect-ratio: 1;
          object-fit: contain;
          cursor: grab;
        }
        .globe-canvas:active {
          cursor: grabbing;
        }

        /* Order ping toast */
        .order-ping {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          animation: pingFade 3s ease forwards;
          pointer-events: none;
        }
        .ping-label {
          background: rgba(91,157,255,0.15);
          border: 0.5px solid rgba(91,157,255,0.4);
          color: #93c5fd;
          font-size: 12px;
          padding: 5px 12px;
          border-radius: 20px;
          white-space: nowrap;
        }
        @keyframes pingFade {
          0% { opacity: 0; transform: translateX(-50%) translateY(8px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
        }

        /* Sidebar */
        .sidebar {
          width: 220px;
          flex-shrink: 0;
          padding: 8px 20px 20px 8px;
        }
        .sidebar-heading {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #475569;
          margin: 0 0 12px;
        }

        .location-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .location-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .location-meta {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .location-rank {
          font-size: 10px;
          color: #334155;
          min-width: 12px;
        }
        .location-city {
          font-size: 13px;
          font-weight: 500;
          color: #e2e8f0;
        }
        .location-country {
          font-size: 11px;
          color: #475569;
        }
        .location-bar-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-left: 18px;
        }
        .location-bar {
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(90deg, #22e5a0, #5b9dff);
          transition: width 0.6s ease;
          flex-shrink: 0;
        }
        .location-count {
          font-size: 11px;
          color: #475569;
          white-space: nowrap;
        }

        /* Skeletons */
        .skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .skeleton-row {
          height: 32px;
          border-radius: 6px;
          background: rgba(255,255,255,0.04);
          animation: shimmer 1.4s ease infinite;
        }
        @keyframes shimmer {
          0%,100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        .no-data {
          font-size: 12px;
          color: #334155;
          margin: 8px 0 0;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .globe-layout { flex-direction: column; }
          .sidebar { width: 100%; padding: 0 16px 16px; }
          .stats-bar { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-component: stat card ──────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
