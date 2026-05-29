import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { brandSettingsService, brandService } from "../../services";
import Dropdown from "../ui/Dropdown";

const ThreeGlobe = dynamic(() => import("./ThreeGlobe"), { ssr: false });

const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtTime = s => `${Math.floor(s / 60)}m ${s % 60}s`;
const fmtCurrency = n => n > 0 ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—';

/* ── Icons ── */
const IC = {
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  page: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  source: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  cart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  rupee: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12M6 8h12M6 13l8 8M6 13h3a4 4 0 0 0 0-8H6"/></svg>,
  chevDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
};

// City coords
const CITY_COORDS = {
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
  London: [51.507, -0.128], "New York": [40.714, -74.006], "Los Angeles": [34.052, -118.244],
  Toronto: [43.651, -79.347], Sydney: [-33.868, 151.209], Dubai: [25.204, 55.27],
  Singapore: [1.352, 103.82], "Kuala Lumpur": [3.139, 101.687], Bangkok: [13.756, 100.502],
  Paris: [48.857, 2.347], Berlin: [52.52, 13.405], Tokyo: [35.689, 139.692],
  "Hong Kong": [22.319, 114.169], Riyadh: [24.688, 46.722], Doha: [25.286, 51.533],
  Melbourne: [-37.814, 144.963], Chicago: [41.878, -87.63], Houston: [29.76, -95.37],
  "San Francisco": [37.774, -122.419], Seattle: [47.606, -122.332],
};

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

/* ── Section Title (matches dashboard) ── */
function SectionTitle({ icon, children }) {
  return (
    <div className="dc-section-title">
      <span className="dc-section-icon">{icon}</span>
      {children}
    </div>
  );
}

/* ── Collapsible Section ── */
function CollapsibleSection({ icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="dashboard-section">
      <button className="dc-collapse-trigger" onClick={() => setOpen(!open)} type="button">
        <SectionTitle icon={icon}>{title}</SectionTitle>
        <span className="dc-collapse-chevron">{open ? IC.chevUp : IC.chevDown}</span>
      </button>
      {open && <div className="dc-collapse-body">{children}</div>}
    </div>
  );
}

/* ── Bar Row for list panels ── */
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


export default function AnalyticsPage() {
  const markersRef = useRef([]);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState(null);
  const [realtimeUsers, setRealtimeUsers] = useState(null);
  const [pages, setPages] = useState([]);
  const [sources, setSources] = useState([]);
  const [topLocations, setTopLocations] = useState([]);
  const [brandId, setBrandId] = useState(1);
  const [brands, setBrands] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [ga4Configured, setGa4Configured] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [dateRange] = useState({ start: 'today', end: 'today' });

  useEffect(() => { setMounted(true); }, []);

  // Load brands
  useEffect(() => {
    if (!mounted) return;
    brandService.getAllBrands(true)
      .then(r => { if (r.success && r.data.length > 0) setBrands(r.data); })
      .catch(() => {});
  }, [mounted]);

  // Load GA4 settings — just check that they're configured.
  // The actual token minting + API calls happen on the server (/api/ga4-proxy).
  useEffect(() => {
    if (!mounted || !brandId) return;
    setSettingsLoading(true);
    brandSettingsService.getSettingsByCategory(brandId, "analytics")
      .then(r => {
        const list = r.data || r || [];
        const pid = list.find(s => s.key === "GA4_PROPERTY_ID");
        const email = list.find(s => s.key === "GA4_SA_EMAIL");
        const pkey = list.find(s => s.key === "GA4_SA_PRIVATE_KEY");
        const configured = !!(pid?.value && email?.value && pkey?.value);
        setGa4Configured(configured);
      })
      .catch(() => setGa4Configured(false))
      .finally(() => setSettingsLoading(false));
  }, [mounted, brandId]);

  // Server-side proxy call. Browser only ever talks to our own origin,
  // so ad-blockers and CORS quirks on analyticsdata.googleapis.com don't apply.
  const callGa4 = useCallback(async (type, body) => {
    const authToken = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    const res = await fetch(`/api/ga4-proxy?brandId=${brandId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, body }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `GA4 proxy returned ${res.status}`);
    return j;
  }, [brandId]);

  // Fetch realtime active users (every 30s)
  const fetchRealtime = useCallback(async () => {
    if (!ga4Configured) return;
    try {
      const data = await callGa4("realtime", {
        dimensions: [{ name: "city" }, { name: "country" }],
        metrics: [{ name: "activeUsers" }],
        minuteRanges: [{ name: "0-5", startMinutesAgo: 5, endMinutesAgo: 0 }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10,
      });
      const rows = data.rows ?? [];
      const total = rows.reduce((acc, r) => acc + parseInt(r.metricValues[0]?.value ?? "0", 10), 0);
      setRealtimeUsers(total);

      const newMarkers = [];
      rows.forEach(row => {
        const city = row.dimensionValues[0]?.value ?? "";
        const country = row.dimensionValues[1]?.value ?? "";
        const count = parseInt(row.metricValues[0]?.value ?? "1", 10);
        const coords = CITY_COORDS[city] || COUNTRY_COORDS[country];
        if (coords) {
          newMarkers.push({ location: [coords[0], coords[1]], city, count, size: 0.05 });
        } else {
          newMarkers.push({ city, count, size: 0.05 });
        }
      });
      markersRef.current = newMarkers;
      setApiError(null);
    } catch (err) {
      console.error('[Analytics realtime]', err);
      setApiError(err?.message || 'Failed to fetch realtime users');
    }
  }, [ga4Configured, callGa4]);

  // Fetch today's full report (every 5 min)
  const fetchGA4Stats = useCallback(async () => {
    if (!ga4Configured) return;
    try {
      const excludeDashboard = { notExpression: { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/dashboard" } } } };
      const excludeAuth = { notExpression: { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/auth" } } } };
      const pageFilter = { andGroup: { expressions: [excludeDashboard, excludeAuth] } };

      const [mainData, yestData, pagesData, srcData, locData] = await Promise.all([
        callGa4("report", { dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }], metrics: [{ name: "sessions" }, { name: "screenPageViews" }, { name: "activeUsers" }, { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "newUsers" }, { name: "purchaseRevenue" }, { name: "transactions" }] }),
        callGa4("report", { dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }], metrics: [{ name: "sessions" }] }),
        callGa4("report", { dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 6, dimensionFilter: pageFilter }),
        callGa4("report", { dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }], dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 5 }),
        callGa4("report", { dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }], dimensions: [{ name: "city" }, { name: "country" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 5 }),
      ]);

      const mv = mainData.rows?.[0]?.metricValues || [];
      const sessions = parseInt(mv[0]?.value || "0", 10);
      const pageviews = parseInt(mv[1]?.value || "0", 10);
      const active = parseInt(mv[2]?.value || "0", 10);
      const bounceRate = (parseFloat(mv[3]?.value || "0") * 100).toFixed(1);
      const avgSession = Math.round(parseFloat(mv[4]?.value || "0"));
      const newUsers = parseInt(mv[5]?.value || "0", 10);
      const revenue = parseFloat(mv[6]?.value || "0");
      const orders = parseInt(mv[7]?.value || "0", 10);
      const returning = Math.max(0, active - newUsers);
      const yest = parseInt(yestData.rows?.[0]?.metricValues?.[0]?.value || "1", 10);
      const sessionsDelta = yest > 0 ? `${sessions >= yest ? "+" : ""}${(((sessions - yest) / yest) * 100).toFixed(1)}% vs yesterday` : "";

      setStats({ active, sessions, pageviews, bounceRate, avgSession, newUsers, returning, sessionsDelta, revenue, orders });
      setPages((pagesData.rows || []).map(r => ({ label: r.dimensionValues[0]?.value || "/", val: parseInt(r.metricValues[0]?.value || "0", 10) })));
      setSources((srcData.rows || []).map(r => ({ label: r.dimensionValues[0]?.value || "Other", val: parseInt(r.metricValues[0]?.value || "0", 10) })));
      setTopLocations((locData.rows || []).map(r => ({ name: `${r.dimensionValues[0]?.value} · ${r.dimensionValues[1]?.value}`, val: parseInt(r.metricValues[0]?.value || "0", 10) })));
      setLastUpdated(new Date());
      setApiError(null);
    } catch (err) {
      console.error("[Analytics]", err);
      setApiError(err?.message || 'Failed to fetch GA4 report');
    }
  }, [ga4Configured, callGa4, dateRange]);

  useEffect(() => {
    if (!ga4Configured) return;
    fetchGA4Stats();
    const firstPing = setTimeout(() => fetchRealtime(), 500);
    const t1 = setInterval(fetchGA4Stats, 5 * 60 * 1000);
    const t2 = setInterval(fetchRealtime, 30 * 1000);
    return () => { clearTimeout(firstPing); clearInterval(t1); clearInterval(t2); };
  }, [ga4Configured, fetchGA4Stats, fetchRealtime]);

  if (!mounted) return null;

  const dataLoading = ga4Configured && !stats && !apiError;

  return (
    <div className="dashboard-sections">

      {/* ═══ 1. TOP BAR — Title + Brand + Live Status ═══ */}
      <div className="dc-topbar">
        <div className="dc-greeting">
          <span className="dc-greeting-text">Analytics</span>
          <span className="dc-greeting-sub">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Google Analytics · Today'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {brands.length > 1 && (
            <Dropdown
              value={brandId}
              onChange={val => setBrandId(Number(val))}
              options={brands.map(b => ({ value: b.id, label: b.display_name || b.name }))}
              className="bset-brand-select"
            />
          )}
          {ga4Configured && stats && !apiError && (
            <div className="an-live-pill"><span className="an-live-dot" /> Live · GA4</div>
          )}
          {ga4Configured && stats && !apiError && (
            <span className="an-connected-badge">✓ Connected</span>
          )}
          {!ga4Configured && !settingsLoading && (
            <a href="/dashboard/brandSettings" className="an-setup-btn" style={{ textDecoration: 'none' }}>Setup GA4</a>
          )}
        </div>
      </div>

      {/* ═══ NOT CONFIGURED STATE ═══ */}
      {!settingsLoading && !ga4Configured && (
        <div className="dashboard-section" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#180D3E', marginBottom: 8 }}>Google Analytics not configured</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Add your GA4 credentials in Brand Settings to see real data.</div>
          <div style={{ fontSize: 13, color: '#374151', display: 'inline-block', textAlign: 'left', marginBottom: 20 }}>
            Add these keys under <strong>Brand Settings → Analytics</strong>:
            <ul style={{ margin: '8px 0 0 16px' }}>
              <li style={{ margin: '4px 0' }}><code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>GA4_PROPERTY_ID</code></li>
              <li style={{ margin: '4px 0' }}><code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>GA4_SA_EMAIL</code></li>
              <li style={{ margin: '4px 0' }}><code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>GA4_SA_PRIVATE_KEY</code></li>
            </ul>
          </div>
          <div><a href="/dashboard/brandSettings" className="an-setup-btn" style={{ textDecoration: 'none' }}>Go to Brand Settings</a></div>
        </div>
      )}

      {dataLoading && (
        <div className="dashboard-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '80px 24px', color: '#6b7280', fontSize: 14 }}>
          <div className="an-spinner" />
          <span>Loading analytics data…</span>
        </div>
      )}

      {apiError && (
        <div className="dashboard-section" style={{ padding: '16px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Google Analytics error</div>
          <div style={{ fontSize: 13, color: '#7f1d1d', wordBreak: 'break-word' }}>{apiError}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            Common fixes: confirm <code>GA4_PROPERTY_ID</code> is the numeric ID from GA4 Admin → Property Settings,
            and that the service account email has Viewer access on that GA4 property.
          </div>
        </div>
      )}

      {/* ═══ 2. KPI STRIP ═══ */}
      {(stats || realtimeUsers !== null) && (
        <div className="dc-kpi-strip">
          <div className="dc-kpi-tile" style={{ borderLeftColor: '#CE1E36' }}>
            <span className="dc-kpi-label">Active Now</span>
            <span className="dc-kpi-value" style={{ color: '#CE1E36' }}>{realtimeUsers ?? '—'}</span>
          </div>
          <div className="dc-kpi-tile" style={{ borderLeftColor: '#180D3E' }}>
            <span className="dc-kpi-label">Sessions</span>
            <span className="dc-kpi-value">{stats ? fmt(stats.sessions) : '—'}</span>
            {stats?.sessionsDelta && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>{stats.sessionsDelta}</span>}
          </div>
          <div className="dc-kpi-tile" style={{ borderLeftColor: '#7c3aed' }}>
            <span className="dc-kpi-label">Orders</span>
            <span className="dc-kpi-value" style={{ color: '#180D3E' }}>{stats ? stats.orders : '—'}</span>
          </div>
          <div className="dc-kpi-tile" style={{ borderLeftColor: '#059669' }}>
            <span className="dc-kpi-label">Revenue</span>
            <span className="dc-kpi-value" style={{ color: '#059669' }}>{stats ? fmtCurrency(stats.revenue) : '—'}</span>
          </div>
          <div className="dc-kpi-tile" style={{ borderLeftColor: '#2563eb' }}>
            <span className="dc-kpi-label">Pageviews</span>
            <span className="dc-kpi-value">{stats ? fmt(stats.pageviews) : '—'}</span>
          </div>
          <div className="dc-kpi-tile" style={{ borderLeftColor: '#d97706' }}>
            <span className="dc-kpi-label">New Users</span>
            <span className="dc-kpi-value">{stats ? fmt(stats.newUsers) : '—'}</span>
          </div>
          <div className="dc-kpi-tile" style={{ borderLeftColor: '#dc2626' }}>
            <span className="dc-kpi-label">Bounce Rate</span>
            <span className="dc-kpi-value">{stats ? `${stats.bounceRate}%` : '—'}</span>
          </div>
          <div className="dc-kpi-tile" style={{ borderLeftColor: '#0891b2' }}>
            <span className="dc-kpi-label">Avg Session</span>
            <span className="dc-kpi-value">{stats ? fmtTime(stats.avgSession) : '—'}</span>
          </div>
          <div className="dc-kpi-tile" style={{ borderLeftColor: '#6b7280' }}>
            <span className="dc-kpi-label">Returning</span>
            <span className="dc-kpi-value">{stats ? fmt(stats.returning) : '—'}</span>
          </div>
          <div className="dc-kpi-tile" style={{ borderLeftColor: '#f59e0b' }}>
            <span className="dc-kpi-label">Active Users</span>
            <span className="dc-kpi-value">{stats ? fmt(stats.active) : '—'}</span>
          </div>
        </div>
      )}

      {/* ═══ 3. GLOBE — Live Visitor Map ═══ */}
      <CollapsibleSection icon={IC.globe} title="Live Visitor Map" defaultOpen={true}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
          {realtimeUsers !== null && (
            <span className="an-active-badge"><span className="an-live-dot" /> {realtimeUsers} active now</span>
          )}
        </div>
        <div className="an-globe-canvas-wrap">
          <ThreeGlobe markersRef={markersRef} />
        </div>
      </CollapsibleSection>

      {/* ═══ 4. BOTTOM PANELS — 3 col grid ═══ */}
      {stats && (
        <div className="an-panels-grid">
          <div className="dashboard-section">
            <SectionTitle icon={IC.page}>Top Pages</SectionTitle>
            <div className="an-list-rows">
              {pages.length > 0
                ? pages.map((p, i) => <BarRow key={i} label={p.label} value={p.val} max={pages[0]?.val || 1} color="#180D3E" />)
                : <div className="an-no-data">No data</div>}
            </div>
          </div>
          <div className="dashboard-section">
            <SectionTitle icon={IC.source}>Traffic Sources</SectionTitle>
            <div className="an-list-rows">
              {sources.length > 0
                ? sources.map((s, i) => <BarRow key={i} label={s.label} value={s.val} max={sources[0]?.val || 1} color="#CE1E36" />)
                : <div className="an-no-data">No data</div>}
            </div>
          </div>
          <div className="dashboard-section">
            <SectionTitle icon={IC.pin}>Top Locations</SectionTitle>
            <div className="an-list-rows">
              {topLocations.length > 0
                ? topLocations.map((l, i) => <BarRow key={i} label={l.name} value={l.val} max={topLocations[0]?.val || 1} color="#7c3aed" />)
                : <div className="an-no-data">No data</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
