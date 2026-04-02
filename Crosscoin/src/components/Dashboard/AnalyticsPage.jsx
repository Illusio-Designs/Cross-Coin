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

// India center: lat 22.5, lon 82 → phi/theta for cobe
// Cobe phi: 0 = lon 0° (Greenwich), positive = westward rotation
// India lon ~82°E → phi = -82 * π/180 (rotate east to bring India front)
const INDIA_PHI   = -82 * (Math.PI / 180);
const INDIA_THETA = 0.3; // tilt down slightly to center India vertically

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

  useEffect(() => { setMounted(true); }, []);

  // Init Cobe globe when ga4Configured becomes true
  useEffect(() => {
    if (!mounted || !ga4Configured || !canvasRef.current) return;
    const SIZE = 500;
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
      markerColor: [0.808, 0.118, 0.212], // #CE1E36
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

  // Load brands (for multi-brand selector only — default stays brandId=1)
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

      // Ping map for each city — expanded coords list
      const CITY_COORDS = {
        // India
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
        // International
        London: [51.507, -0.128], "New York": [40.714, -74.006], "Los Angeles": [34.052, -118.244],
        Toronto: [43.651, -79.347], Sydney: [-33.868, 151.209], Dubai: [25.204, 55.27],
        Singapore: [1.352, 103.82], "Kuala Lumpur": [3.139, 101.687], Bangkok: [13.756, 100.502],
        Paris: [48.857, 2.347], Berlin: [52.52, 13.405], Tokyo: [35.689, 139.692],
        "Hong Kong": [22.319, 114.169], Riyadh: [24.688, 46.722], Doha: [25.286, 51.533],
        Melbourne: [-37.814, 144.963], Chicago: [41.878, -87.63], Houston: [29.76, -95.37],
        "San Francisco": [37.774, -122.419], Seattle: [47.606, -122.332],
      };

      if (globeRef.current) {
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
        const newMarkers = [];
        rows.forEach(row => {
          const city = row.dimensionValues[0]?.value ?? "";
          const country = row.dimensionValues[1]?.value ?? "";
          const coords = CITY_COORDS[city] || COUNTRY_COORDS[country];
          if (coords) newMarkers.push({ location: [coords[0], coords[1]], size: 0.05 });
        });
        markersRef.current = newMarkers;
        globeRef.current.update({ markers: newMarkers });
      }
    } catch {}
  }, [accessToken, propertyId]);

  // Fetch today's full report (every 5 min)
  const fetchGA4Stats = useCallback(async () => {
    if (!accessToken || !propertyId) return;
    try {
      const base = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
      const h = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
      const post = body => fetch(base, { method: "POST", headers: h, body: JSON.stringify(body) }).then(r => r.json());

      // Filter to exclude /dashboard and /auth paths from all page-based queries
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
    // Delay first realtime fetch to ensure map is initialized
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

        {/* Globe Map */}
        {ga4Configured && (
          <div className="an-map-wrap">
            <div className="an-map-header">
              <span className="an-map-title">Live Visitor Map</span>
              <span className="an-map-sub">Pings show realtime active cities</span>
            </div>
            <div className="an-globe-container">
              <canvas ref={canvasRef} className="an-globe-canvas" />
            </div>
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
        .an-map-wrap {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .an-map-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        .an-map-title {
          font-size: 12px;
          font-weight: 700;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: .6px;
        }
        .an-map-sub {
          font-size: 11px;
          color: #6b7280;
        }
        .an-map {
          display: none;
        }
        .an-globe-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px 0 16px;
          background: transparent;
        }
        .an-globe-canvas {
          width: 500px;
          height: 500px;
          cursor: default;
          pointer-events: none;
        }
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
