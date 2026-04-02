import { useEffect, useState, useCallback, useRef } from "react";
import createGlobe from "cobe";
import { brandSettingsService, brandService } from "../../services";
import Dropdown from "../ui/Dropdown";

const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtTime = s => `${Math.floor(s / 60)}m ${s % 60}s`;

function StatCard({ label, value, delta, accent }) {
  return (
    <div className="an-stat-card">
      <div className="an-stat-label">{label}</div>
      <div className="an-stat-value" style={accent ? { color: accent } : {}}>{value ?? "—"}</div>
      {delta && <div className="an-stat-delta" style={{ color: "#16a34a" }}>{delta}</div>}
    </div>
  );
}

function BarRow({ label, value, max, color = "#CE1E36" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="an-bar-row">
      <span className="an-bar-label">{label}</span>
      <div className="an-bar-track">
        <div className="an-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="an-bar-val">{fmt(value)}</span>
    </div>
  );
}

// ─── India SVG Map ────────────────────────────────────────────────────────────
// Bounding box for India: lat 6–37°N, lon 68–98°E
// SVG viewport: 400 × 480
const INDIA_MAP_W = 400;
const INDIA_MAP_H = 480;
const INDIA_LAT_MIN = 6,  INDIA_LAT_MAX = 37;
const INDIA_LON_MIN = 68, INDIA_LON_MAX = 98;

function latLonToSVG(lat, lon) {
  const x = ((lon - INDIA_LON_MIN) / (INDIA_LON_MAX - INDIA_LON_MIN)) * INDIA_MAP_W;
  const y = ((INDIA_LAT_MAX - lat) / (INDIA_LAT_MAX - INDIA_LAT_MIN)) * INDIA_MAP_H;
  return [x, y];
}

function isIndianCity(lat, lon) {
  return lat >= INDIA_LAT_MIN && lat <= INDIA_LAT_MAX &&
         lon >= INDIA_LON_MIN && lon <= INDIA_LON_MAX;
}

// Simplified India border path (approximate outline for SVG)
// Points are [lon, lat] pairs converted to SVG space
const INDIA_BORDER_COORDS = [
  [77.8,35.5],[78.9,34.5],[79.3,33.0],[80.2,32.4],[81.1,30.8],[82.6,30.1],
  [84.1,28.5],[85.2,27.9],[87.1,27.1],[88.9,27.3],[89.5,26.7],[90.4,26.9],
  [92.1,26.8],[93.5,27.2],[95.2,28.0],[96.5,28.3],[97.1,27.8],[97.4,26.5],
  [96.2,25.5],[95.3,23.8],[94.2,22.7],[93.1,22.3],[92.6,21.8],[92.5,21.0],
  [91.9,22.0],[91.4,22.8],[90.5,22.7],[89.8,21.7],[89.5,22.0],[88.9,22.8],
  [88.1,22.5],[87.4,21.6],[86.7,20.4],[85.8,19.8],[85.1,19.1],[84.4,18.3],
  [83.5,18.4],[82.3,17.1],[81.4,16.5],[80.3,15.9],[80.1,14.0],[79.4,12.5],
  [78.9,11.1],[78.2,10.0],[77.6,8.4],[76.8,8.2],[76.3,9.5],[76.2,10.3],
  [75.7,11.8],[74.8,12.9],[74.1,14.1],[73.8,15.0],[73.5,16.0],[73.3,17.0],
  [72.8,18.9],[72.6,20.2],[72.7,21.1],[70.4,22.1],[68.9,22.9],[68.1,23.6],
  [68.2,24.3],[69.1,24.9],[70.5,25.0],[71.0,25.7],[70.3,26.0],[70.0,27.5],
  [69.5,28.5],[70.2,29.5],[70.8,30.0],[71.6,31.0],[72.3,32.1],[73.9,33.5],
  [74.3,34.1],[75.3,34.7],[76.2,35.0],[77.2,35.5],[77.8,35.5],
];

const INDIA_PATH_D = (() => {
  return INDIA_BORDER_COORDS.map(([lon, lat], i) => {
    const [x, y] = latLonToSVG(lat, lon);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
})();

function IndiaPingMap({ indianMarkers }) {

  if (!indianMarkers || indianMarkers.length === 0) return null;

  return (
    <div className="an-india-map-wrap">
      <div className="an-india-map-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        Live Traffic · India
      </div>
      <div className="an-india-map-svg-wrap">
        <svg
          viewBox={`0 0 ${INDIA_MAP_W} ${INDIA_MAP_H}`}
          width={INDIA_MAP_W}
          height={INDIA_MAP_H}
          className="an-india-svg"
        >
          {/* Map fill & border */}
          <path d={INDIA_PATH_D} className="an-india-border" />

          {/* Grid lines (subtle lat/lon grid) */}
          {[10, 15, 20, 25, 30, 35].map(lat => {
            const [, y] = latLonToSVG(lat, 68);
            return <line key={`lat-${lat}`} x1="0" y1={y} x2={INDIA_MAP_W} y2={y} className="an-india-grid" />;
          })}
          {[70, 75, 80, 85, 90, 95].map(lon => {
            const [x] = latLonToSVG(6, lon);
            return <line key={`lon-${lon}`} x1={x} y1="0" x2={x} y2={INDIA_MAP_H} className="an-india-grid" />;
          })}

          {/* Ping markers */}
          {indianMarkers.map((m, i) => {
            const [lat, lon] = m.location;
            const [x, y] = latLonToSVG(lat, lon);
            const delay = (i * 0.4) % 2;
            return (
              <g key={`${lat}-${lon}-${i}`}>
                {/* Outer pulse ring */}
                <circle
                  cx={x} cy={y} r="10"
                  className="an-india-ping-ring"
                  style={{ animationDelay: `${delay}s` }}
                />
                {/* Mid ring */}
                <circle
                  cx={x} cy={y} r="6"
                  className="an-india-ping-mid"
                  style={{ animationDelay: `${delay + 0.15}s` }}
                />
                {/* Core dot */}
                <circle cx={x} cy={y} r="3" className="an-india-ping-core" />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// City coords (India only subset for map filtering)
export const CITY_COORDS = {
  Mumbai: [19.076, 72.877], Delhi: [28.613, 77.209], Bangalore: [12.971, 77.594],
  Chennai: [13.082, 80.27], Hyderabad: [17.385, 78.487], Pune: [18.52, 73.857],
  Kolkata: [22.572, 88.363], Ahmedabad: [23.022, 72.571], Surat: [21.17, 72.831],
  Rajkot: [22.303, 70.802], Jaipur: [26.912, 75.787], Lucknow: [26.846, 80.946],
  Bhopal: [23.259, 77.413], Indore: [22.719, 75.857], Nagpur: [21.145, 79.088],
  Patna: [25.594, 85.137], Vadodara: [22.307, 73.181], Coimbatore: [11.017, 76.955],
  Kochi: [9.931, 76.267], Chandigarh: [30.733, 76.779], Gurgaon: [28.459, 77.026],
  Noida: [28.535, 77.391], Visakhapatnam: [17.686, 83.218], Agra: [27.176, 78.008],
  Varanasi: [25.317, 82.973], Meerut: [28.984, 77.706], Nashik: [19.997, 73.789],
  Aurangabad: [19.877, 75.343], Amritsar: [31.634, 74.872], Jodhpur: [26.292, 73.017],
  // International (kept for globe only)
  London: [51.507, -0.128], "New York": [40.714, -74.006], "Los Angeles": [34.052, -118.244],
  Toronto: [43.651, -79.347], Sydney: [-33.868, 151.209], Dubai: [25.204, 55.27],
  Singapore: [1.352, 103.82], "Kuala Lumpur": [3.139, 101.687], Bangkok: [13.756, 100.502],
  Paris: [48.857, 2.347], Berlin: [52.52, 13.405], Tokyo: [35.689, 139.692],
  "Hong Kong": [22.319, 114.169], Riyadh: [24.688, 46.722], Doha: [25.286, 51.533],
  Melbourne: [-37.814, 144.963], Chicago: [41.878, -87.63], Houston: [29.76, -95.37],
  "San Francisco": [37.774, -122.419], Seattle: [47.606, -122.332],
};

// India center: lat 22.5, lon 82 → phi/theta for cobe
const INDIA_PHI   = 0.4;
const INDIA_THETA = 5.5;

export default function AnalyticsPage() {
  const canvasRef     = useRef(null);
  const globeRef      = useRef(null);
  const markersRef    = useRef([]);
  const [mounted, setMounted]               = useState(false);
  const [stats, setStats]                   = useState(null);
  const [realtimeUsers, setRealtimeUsers]   = useState(null);
  const [pages, setPages]                   = useState([]);
  const [sources, setSources]               = useState([]);
  const [topLocations, setTopLocations]     = useState([]);
  const [brandId, setBrandId]               = useState(1);
  const [brands, setBrands]                 = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [ga4Configured, setGa4Configured]   = useState(false);
  const [propertyId, setPropertyId]         = useState("");
  const [accessToken, setAccessToken]       = useState("");
  const [lastUpdated, setLastUpdated]       = useState(null);
  // NEW: Indian markers for the SVG map
  const [indianMapMarkers, setIndianMapMarkers] = useState([]);

  useEffect(() => { setMounted(true); }, []);

  // Init Cobe globe
  useEffect(() => {
    if (!mounted || !ga4Configured || !canvasRef.current) return;
    const SIZE = 700;
    const dpr  = window.devicePixelRatio || 1;
    canvasRef.current.width  = SIZE * dpr;
    canvasRef.current.height = SIZE * dpr;

    globeRef.current = createGlobe(canvasRef.current, {
      devicePixelRatio: dpr,
      width:  SIZE * dpr,
      height: SIZE * dpr,
      phi:    INDIA_PHI,
      theta:  INDIA_THETA,
      dark:   0,
      diffuse: 1.2,
      mapSamples: 20000,
      mapBrightness: 6,
      baseColor:   [1, 1, 1],
      markerColor: [0.808, 0.118, 0.212],
      glowColor:   [0.85, 0.85, 0.95],
      markers: markersRef.current,
      scale: 1,
      onRender: (state) => {
        state.phi     = INDIA_PHI;
        state.theta   = INDIA_THETA;
        state.markers = markersRef.current;
      },
    });

    return () => { globeRef.current?.destroy(); globeRef.current = null; };
  }, [mounted, ga4Configured]);

  // Load brands
  useEffect(() => {
    if (!mounted) return;
    brandService.getAllBrands(true)
      .then(r => { if (r.success && r.data.length > 0) setBrands(r.data); })
      .catch(() => {});
  }, [mounted]);

  // Load GA4 settings + auto-token
  useEffect(() => {
    if (!mounted || !brandId) return;
    setSettingsLoading(true);
    brandSettingsService.getSettingsByCategory(brandId, "analytics")
      .then(r => {
        const list = r.data || r || [];
        const pid  = list.find(s => s.key === "GA4_PROPERTY_ID");
        const email = list.find(s => s.key === "GA4_SA_EMAIL");
        const pkey  = list.find(s => s.key === "GA4_SA_PRIVATE_KEY");
        const configured = !!(pid?.value && email?.value && pkey?.value);
        setGa4Configured(configured);
        if (pid?.value) setPropertyId(pid.value);
        if (configured) {
          const authToken = typeof window !== "undefined" ? localStorage.getItem("token") : "";
          fetch(`/api/ga4-token?brandId=${brandId}`, { headers: { Authorization: `Bearer ${authToken}` } })
            .then(r => r.json())
            .then(data => { if (data.accessToken) setAccessToken(data.accessToken); })
            .catch(() => {});
        }
      })
      .catch(() => setGa4Configured(false))
      .finally(() => setSettingsLoading(false));
  }, [mounted, brandId]);

  const COUNTRY_COORDS = {
    India: [20.593, 78.962], "United States": [37.09, -95.712],
    "United Kingdom": [55.378, -3.436], Canada: [56.13, -106.347],
    Australia: [-25.274, 133.775], UAE: [23.424, 53.848],
    Singapore: [1.352, 103.82], Malaysia: [4.21, 101.975],
    Germany: [51.165, 10.451], France: [46.227, 2.213],
    Japan: [36.204, 138.252], "Hong Kong": [22.319, 114.169],
    "Saudi Arabia": [23.886, 45.079], Qatar: [25.354, 51.184],
    Thailand: [15.87, 100.993], Netherlands: [52.132, 5.291],
    "New Zealand": [-40.9, 174.886], "South Africa": [-30.559, 22.937],
  };

  // Fetch realtime active users (every 30s)
  const fetchRealtime = useCallback(async () => {
    if (!accessToken || !propertyId) return;
    try {
      const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runRealtimeReport`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            dimensions: [{ name: "city" }, { name: "country" }],
            metrics: [{ name: "activeUsers" }],
            minuteRanges: [{ name: "0-5", startMinutesAgo: 5, endMinutesAgo: 0 }],
            orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
            limit: 10,
          }),
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      const rows = data.rows ?? [];
      const total = rows.reduce((acc, r) => acc + parseInt(r.metricValues[0]?.value ?? "0", 10), 0);
      setRealtimeUsers(total);

      const newMarkers = [];
      const newIndiaMarkers = [];

      rows.forEach(row => {
        const city    = row.dimensionValues[0]?.value ?? "";
        const country = row.dimensionValues[1]?.value ?? "";
        const coords  = CITY_COORDS[city] || COUNTRY_COORDS[country];
        if (!coords) return;

        const [lat, lon] = coords;

        // Globe markers (all locations)
        newMarkers.push({ location: [lat, lon], size: 0.05 });

        // India map markers (only Indian bounding box)
        if (isIndianCity(lat, lon)) {
          newIndiaMarkers.push({ location: [lat, lon], city, users: parseInt(row.metricValues[0]?.value ?? "1", 10) });
        }
      });

      markersRef.current = newMarkers;
      if (globeRef.current) globeRef.current.update({ markers: newMarkers });

      // Update India SVG map
      setIndianMapMarkers(newIndiaMarkers);

    } catch {}
  }, [accessToken, propertyId]);

  // Fetch today's full report (every 5 min)
  const fetchGA4Stats = useCallback(async () => {
    if (!accessToken || !propertyId) return;
    try {
      const base = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
      const h = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
      const post = body => fetch(base, { method: "POST", headers: h, body: JSON.stringify(body) }).then(r => r.json());

      const excludeDashboard = { notExpression: { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/dashboard" } } } };
      const excludeAuth = { notExpression: { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/auth" } } } };
      const pageFilter = { andGroup: { expressions: [excludeDashboard, excludeAuth] } };

      const [mainData, yestData, pagesData, srcData, locData] = await Promise.all([
        post({ dateRanges: [{ startDate: "today", endDate: "today" }], metrics: [{ name: "sessions" }, { name: "screenPageViews" }, { name: "activeUsers" }, { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "newUsers" }, { name: "purchaseRevenue" }, { name: "transactions" }] }),
        post({ dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }], metrics: [{ name: "sessions" }] }),
        post({ dateRanges: [{ startDate: "today", endDate: "today" }], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 6, dimensionFilter: pageFilter }),
        post({ dateRanges: [{ startDate: "today", endDate: "today" }], dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 5 }),
        post({ dateRanges: [{ startDate: "today", endDate: "today" }], dimensions: [{ name: "city" }, { name: "country" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 5 }),
      ]);

      const mv = mainData.rows?.[0]?.metricValues || [];
      const sessions   = parseInt(mv[0]?.value || "0", 10);
      const pageviews  = parseInt(mv[1]?.value || "0", 10);
      const active     = parseInt(mv[2]?.value || "0", 10);
      const bounceRate = (parseFloat(mv[3]?.value || "0") * 100).toFixed(1);
      const avgSession = Math.round(parseFloat(mv[4]?.value || "0"));
      const newUsers   = parseInt(mv[5]?.value || "0", 10);
      const revenue    = parseFloat(mv[6]?.value || "0");
      const orders     = parseInt(mv[7]?.value || "0", 10);
      const returning  = Math.max(0, active - newUsers);
      const yest       = parseInt(yestData.rows?.[0]?.metricValues?.[0]?.value || "1", 10);
      const sessionsDelta = yest > 0 ? `${sessions >= yest ? "+" : ""}${(((sessions - yest) / yest) * 100).toFixed(1)}% vs yesterday` : "";

      setStats({ active, sessions, pageviews, bounceRate, avgSession, newUsers, returning, sessionsDelta, revenue, orders });
      setPages((pagesData.rows || []).map(r => ({ label: r.dimensionValues[0]?.value || "/", val: parseInt(r.metricValues[0]?.value || "0", 10) })));
      setSources((srcData.rows || []).map(r => ({ label: r.dimensionValues[0]?.value || "Other", val: parseInt(r.metricValues[0]?.value || "0", 10) })));
      setTopLocations((locData.rows || []).map(r => ({ name: `${r.dimensionValues[0]?.value} · ${r.dimensionValues[1]?.value}`, val: parseInt(r.metricValues[0]?.value || "0", 10) })));
      setLastUpdated(new Date());
    } catch (err) { console.error("[Analytics]", err); }
  }, [accessToken, propertyId]);

  useEffect(() => {
    if (!accessToken || !propertyId) return;
    fetchGA4Stats();
    const firstPing = setTimeout(() => fetchRealtime(), 500);
    const t1 = setInterval(fetchGA4Stats, 5 * 60 * 1000);
    const t2 = setInterval(fetchRealtime, 30 * 1000);
    return () => { clearTimeout(firstPing); clearInterval(t1); clearInterval(t2); };
  }, [accessToken, propertyId, fetchGA4Stats, fetchRealtime]);

  if (!mounted) return null;

  return (
    <>
      <div className="dashboard-page">
        {/* Header */}
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <div>
              <h1 className="sl-page-title">Analytics</h1>
              <p className="sl-page-sub">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Google Analytics · Today"}</p>
            </div>
          </div>
          <div className="sl-header-right">
            {brands.length > 1 && (
              <Dropdown
                value={brandId}
                onChange={val => setBrandId(Number(val))}
                options={brands.map(b => ({ value: b.id, label: b.display_name || b.name }))}
                className="bset-brand-select"
              />
            )}
            {accessToken && (
              <div className="an-live-pill"><span className="an-live-dot" /> Live · GA4</div>
            )}
            {ga4Configured && accessToken && (
              <span className="sl-add-btn" style={{ background: "#16a34a", cursor: "default" }}>✓ Connected</span>
            )}
            {!ga4Configured && !settingsLoading && (
              <a href="/dashboard/brandSettings" className="sl-add-btn" style={{ textDecoration: "none" }}>Setup GA4</a>
            )}
          </div>
        </div>

        {/* Not configured */}
        {!settingsLoading && !ga4Configured && (
          <div className="an-empty-state">
            <div className="an-empty-icon">📊</div>
            <div className="an-empty-title">Google Analytics not configured</div>
            <div className="an-empty-sub">Add your GA4 credentials in Brand Settings to see real data.</div>
            <div className="an-empty-keys">
              Add these keys under <strong>Brand Settings → Analytics</strong>:
              <ul>
                <li><code>GA4_PROPERTY_ID</code></li>
                <li><code>GA4_SA_EMAIL</code></li>
                <li><code>GA4_SA_PRIVATE_KEY</code></li>
              </ul>
            </div>
            <a href="/dashboard/brandSettings" className="an-btn an-btn--primary" style={{ textDecoration: "none" }}>Go to Brand Settings</a>
          </div>
        )}

        {!settingsLoading && ga4Configured && !accessToken && (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Connecting to Google Analytics…</div>
        )}

        {/* Stat cards */}
        {(stats || realtimeUsers !== null) && (
          <div className="an-stats-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <StatCard label="Active Now"     value={realtimeUsers ?? "—"}                                                                                              accent="#CE1E36" />
            <StatCard label="Sessions Today" value={stats ? fmt(stats.sessions) : "—"}                                                                                delta={stats?.sessionsDelta} />
            <StatCard label="Orders Today"   value={stats ? stats.orders : "—"}                                                                                       accent="#180D3E" />
            <StatCard label="Revenue Today"  value={stats && stats.revenue > 0 ? `₹${stats.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : "—"}    accent="#16a34a" />
            <StatCard label="Pageviews"      value={stats ? fmt(stats.pageviews) : "—"}  />
            <StatCard label="New Users"      value={stats ? fmt(stats.newUsers) : "—"}   />
            <StatCard label="Bounce Rate"    value={stats ? `${stats.bounceRate}%` : "—"} />
            <StatCard label="Avg Session"    value={stats ? fmtTime(stats.avgSession) : "—"} />
          </div>
        )}

        {/* Globe + India Map side by side */}
        {ga4Configured && (
          <div className="an-maps-row">
            <div className="an-globe-container">
              <canvas ref={canvasRef} className="an-globe-canvas" />
            </div>
            {/* India SVG map — shown when there's Indian traffic */}
            {indianMapMarkers.length > 0 && (
              <IndiaPingMap indianMarkers={indianMapMarkers} />
            )}
          </div>
        )}

        {/* Bottom panels */}
        {stats && (
          <div className="an-bottom-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div className="an-list-panel">
              <div className="an-list-title">Top Pages</div>
              <div className="an-list-rows">
                {pages.length > 0
                  ? pages.map((p, i) => <BarRow key={i} label={p.label} value={p.val} max={pages[0]?.val || 1} color="#180D3E" />)
                  : <div className="an-no-data">No data</div>}
              </div>
            </div>
            <div className="an-list-panel">
              <div className="an-list-title">Traffic Sources</div>
              <div className="an-list-rows">
                {sources.length > 0
                  ? sources.map((s, i) => <BarRow key={i} label={s.label} value={s.val} max={sources[0]?.val || 1} color="#CE1E36" />)
                  : <div className="an-no-data">No data</div>}
              </div>
            </div>
            <div className="an-list-panel">
              <div className="an-list-title">Top Locations</div>
              <div className="an-list-rows">
                {topLocations.length > 0
                  ? topLocations.map((l, i) => <BarRow key={i} label={l.name} value={l.val} max={topLocations[0]?.val || 1} color="#7c3aed" />)
                  : <div className="an-no-data">No data</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .an-map-wrap { display: none; }
        .an-map { display: none; }

        /* ── Globe + India map row ── */
        .an-maps-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
          padding: 8px 0 24px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        /* Globe */
        .an-globe-container {
          display: flex;
          justify-content: center;
          align-items: center;
          background: transparent;
          flex-shrink: 0;
        }
        .an-globe-canvas {
          width: 700px;
          height: 700px;
          cursor: default;
          pointer-events: none;
        }

        /* ── India SVG Map ── */
        .an-india-map-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .an-india-map-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .an-india-map-svg-wrap {
          border-radius: 12px;
          overflow: hidden;
          background: #f8f9ff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          padding: 8px;
        }
        .an-india-svg {
          display: block;
        }

        /* India map path */
        .an-india-border {
          fill: #eef0f8;
          stroke: #c7cde8;
          stroke-width: 1.5;
          stroke-linejoin: round;
          filter: drop-shadow(0 2px 4px rgba(24,13,62,0.08));
        }

        /* Grid lines */
        .an-india-grid {
          stroke: #dde1f0;
          stroke-width: 0.4;
          stroke-dasharray: 3 4;
        }

        /* Ping animations */
        .an-india-ping-ring {
          fill: none;
          stroke: #CE1E36;
          stroke-width: 1.2;
          opacity: 0;
          animation: india-ping 2s ease-out infinite;
        }
        .an-india-ping-mid {
          fill: none;
          stroke: #CE1E36;
          stroke-width: 1;
          opacity: 0;
          animation: india-ping-mid 2s ease-out infinite;
        }
        .an-india-ping-core {
          fill: #CE1E36;
          opacity: 0.92;
          filter: drop-shadow(0 0 3px rgba(206,30,54,0.6));
        }

        @keyframes india-ping {
          0%   { r: 3;  opacity: 0.7; }
          100% { r: 14; opacity: 0; }
        }
        @keyframes india-ping-mid {
          0%   { r: 3;  opacity: 0.5; }
          60%  { r: 9;  opacity: 0.2; }
          100% { r: 9;  opacity: 0; }
        }

        /* Empty state */
        .an-empty-state {
          text-align: center;
          padding: 48px 24px;
          background: #f9fafb;
          border-radius: 10px;
          border: 1px dashed #e5e7eb;
          margin-bottom: 16px;
        }
        .an-empty-icon  { font-size: 40px; margin-bottom: 12px; }
        .an-empty-title { font-size: 18px; font-weight: 700; color: #180D3E; margin-bottom: 8px; }
        .an-empty-sub   { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
        .an-empty-keys  { font-size: 13px; color: #374151; text-align: left; display: inline-block; margin-bottom: 20px; }
        .an-empty-keys ul { margin: 8px 0 0 16px; }
        .an-empty-keys li { margin: 4px 0; }
        .an-empty-keys code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
        .an-no-data { font-size: 12px; color: #9ca3af; padding: 8px 0; }
      `}</style>
    </>
  );
}
