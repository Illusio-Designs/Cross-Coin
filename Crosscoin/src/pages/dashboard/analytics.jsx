import { useEffect, useState, useCallback } from "react";
import { brandSettingsService, brandService } from "../../services";

const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtTime = s => `${Math.floor(s / 60)}m ${s % 60}s`;

function StatCard({ label, value, delta, deltaColor }) {
  return (
    <div className="an-stat-card">
      <div className="an-stat-label">{label}</div>
      <div className="an-stat-value">{value}</div>
      {delta && <div className="an-stat-delta" style={{ color: deltaColor || "#16a34a" }}>{delta}</div>}
    </div>
  );
}

function BarRow({ label, value, max, color = "#3b82f6" }) {
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
  const [mounted, setMounted]               = useState(false);
  const [stats, setStats]                   = useState(null);
  const [pages, setPages]                   = useState([]);
  const [sources, setSources]               = useState([]);
  const [topLocations, setTopLocations]     = useState([]);
  const [brandId, setBrandId]               = useState(1);
  const [brands, setBrands]                 = useState([]);
  const [statsLoading, setStatsLoading]     = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [ga4Configured, setGa4Configured]   = useState(false);
  const [propertyId, setPropertyId]         = useState("");
  const [accessToken, setAccessToken]       = useState("");
  const [lastUpdated, setLastUpdated]       = useState(null);

  useEffect(() => { setMounted(true); }, []);

  // Load brands
  useEffect(() => {
    if (!mounted) return;
    brandService.getAllBrands(true)
      .then(r => {
        if (r.success && r.data.length > 0) {
          setBrands(r.data);
          setBrandId(r.data[0].id);
        }
      }).catch(() => {});
  }, [mounted]);

  // Load GA4 settings and auto-fetch token
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
          fetch(`/api/ga4-token?brandId=${brandId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
            .then(r => r.json())
            .then(data => { if (data.accessToken) setAccessToken(data.accessToken); })
            .catch(() => {});
        }
      })
      .catch(() => setGa4Configured(false))
      .finally(() => setSettingsLoading(false));
  }, [mounted, brandId]);

  // Fetch all GA4 data
  const fetchGA4Stats = useCallback(async () => {
    if (!accessToken || !propertyId) return;
    setStatsLoading(true);
    try {
      const base = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
      const h = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
      const post = (body) => fetch(base, { method: "POST", headers: h, body: JSON.stringify(body) }).then(r => r.json());

      const [mainData, yestData, pagesData, srcData, locData] = await Promise.all([
        post({
          dateRanges: [{ startDate: "today", endDate: "today" }],
          metrics: [
            { name: "sessions" }, { name: "screenPageViews" }, { name: "activeUsers" },
            { name: "bounceRate" }, { name: "averageSessionDuration" }, { name: "newUsers" },
          ],
        }),
        post({
          dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
          metrics: [{ name: "sessions" }],
        }),
        post({
          dateRanges: [{ startDate: "today", endDate: "today" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 6,
        }),
        post({
          dateRanges: [{ startDate: "today", endDate: "today" }],
          dimensions: [{ name: "sessionDefaultChannelGroup"
 }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 5,
        }),
        post({
          dateRanges: [{ startDate: "today", endDate: "today" }],
          dimensions: [{ name: "city" }, { name: "country" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 5,
        }),
      ]);

      const mv = mainData.rows?.[0]?.metricValues || [];
      const sessions   = parseInt(mv[0]?.value || "0", 10);
      const pageviews  = parseInt(mv[1]?.value || "0", 10);
      const active     = parseInt(mv[2]?.value || "0", 10);
      const bounceRate = (parseFloat(mv[3]?.value || "0") * 100).toFixed(1);
      const avgSession = Math.round(parseFloat(mv[4]?.value || "0"));
      const newUsers   = parseInt(mv[5]?.value || "0", 10);
      const returning  = Math.max(0, active - newUsers);
      const yestSessions = parseInt(yestData.rows?.[0]?.metricValues?.[0]?.value || "1", 10);
      const sessionsDelta = yestSessions > 0
        ? `${sessions >= yestSessions ? "+" : ""}${(((sessions - yestSessions) / yestSessions) * 100).toFixed(1)}% vs yesterday`
        : "";

      setStats({ active, sessions, pageviews, bounceRate, avgSession, newUsers, returning, sessionsDelta });
      setPages((pagesData.rows || []).map(r => ({ label: r.dimensionValues[0]?.value || "/", val: parseInt(r.metricValues[0]?.value || "0", 10) })));
      setSources((srcData.rows || []).map(r => ({ label: r.dimensionValues[0]?.value || "Other", val: parseInt(r.metricValues[0]?.value || "0", 10) })));
      setTopLocations((locData.rows || []).map(r => ({ name: `${r.dimensionValues[0]?.value} · ${r.dimensionValues[1]?.value}`, val: parseInt(r.metricValues[0]?.value || "0", 10) })));
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[Analytics] GA4 error:", err);
    }
    setStatsLoading(false);
  }, [accessToken, propertyId]);

  useEffect(() => {
    if (!accessToken || !propertyId) return;
    fetchGA4Stats();
    const t = setInterval(fetchGA4Stats, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [accessToken, propertyId, fetchGA4Stats]);

  if (!mounted) return null;

  return (
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
            <p className="sl-page-sub">
              {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : "Google Analytics · Today"}
            </p>
          </div>
        </div>
        <div className="sl-header-right">
          {brands.length > 1 && (
            <select className="bset-brand-select" value={brandId} onChange={e => setBrandId(Number(e.target.value))}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.display_name || b.name}</option>)}
            </select>
          )}
          {ga4Configured && accessToken && (
            <span className="sl-add-btn" style={{ background: "#16a34a", cursor: "default" }}>✓ GA4 Connected</span>
          )}
          {ga4Configured && !accessToken && (
            <span className="sl-add-btn" style={{ background: "#f59e0b", cursor: "default" }}>Connecting…</span>
          )}
          {!ga4Configured && !settingsLoading && (
            <a href="/dashboard/brandSettings" className="sl-add-btn" style={{ textDecoration: "none" }}>Setup GA4</a>
          )}
        </div>
      </div>

      {/* Not configured empty state */}
      {!settingsLoading && !ga4Configured && (
        <div className="an-empty-state">
          <div className="an-empty-icon">📊</div>
          <div className="an-empty-title">Google Analytics not configured</div>
          <div className="an-empty-sub">Add your GA4 credentials in Brand Settings to see real data.</div>
          <div className="an-empty-keys">
            Add these keys under <strong>Brand Settings → Analytics</strong> category:
            <ul>
              <li><code>GA4_PROPERTY_ID</code> — e.g. <code>properties/123456789</code></li>
              <li><code>GA4_SA_EMAIL</code> — Service account email</li>
              <li><code>GA4_SA_PRIVATE_KEY</code> — Service account private key (PEM)</li>
            </ul>
          </div>
          <a href="/dashboard/brandSettings" className="an-btn an-btn--primary" style={{ textDecoration: "none" }}>
            Go to Brand Settings
          </a>
        </div>
      )}

      {/* Connecting */}
      {!settingsLoading && ga4Configured && !accessToken && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Connecting to Google Analytics…</div>
      )}

      {/* Loading */}
      {statsLoading && !stats && ga4Configured && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Loading analytics…</div>
      )}

      {/* Stat cards */}
      {stats && (
        <div className="an-stats-row">
          <StatCard label="Active Users"    value={stats.active}                                          />
          <StatCard label="Sessions"        value={fmt(stats.sessions)}   delta={stats.sessionsDelta}     />
          <StatCard label="Pageviews"       value={fmt(stats.pageviews)}                                  />
          <StatCard label="New Users"       value={fmt(stats.newUsers)}                                   />
          <StatCard label="Returning Users" value={fmt(stats.returning)}                                  />
          <StatCard label="Bounce Rate"     value={`${stats.bounceRate}%`} deltaColor="#ef4444"           />
          <StatCard label="Avg Session"     value={fmtTime(stats.avgSession)}                             />
        </div>
      )}

      {/* Panels */}
      {stats && (
        <div className="an-bottom-grid">
          <div className="an-list-panel">
            <div className="an-list-title">Top Pages</div>
            <div className="an-list-rows">
              {pages.length > 0
                ? pages.map((p, i) => <BarRow key={i} label={p.label} value={p.val} max={pages[0]?.val || 1} color="#3b82f6" />)
                : <div className="an-no-data">No data</div>}
            </div>
          </div>
          <div className="an-list-panel">
            <div className="an-list-title">Traffic Sources</div>
            <div className="an-list-rows">
              {sources.length > 0
                ? sources.map((s, i) => <BarRow key={i} label={s.label} value={s.val} max={sources[0]?.val || 1} color="#8b5cf6" />)
                : <div className="an-no-data">No data</div>}
            </div>
          </div>
          <div className="an-list-panel">
            <div className="an-list-title">Top Locations</div>
            <div className="an-list-rows">
              {topLocations.length > 0
                ? topLocations.map((l, i) => <BarRow key={i} label={l.name} value={l.val} max={topLocations[0]?.val || 1} color="#10b981" />)
                : <div className="an-no-data">No data</div>}
            </div>
          </div>
          <div className="an-list-panel">
            <div className="an-list-title">New vs Returning</div>
            <div className="an-list-rows">
              <BarRow label="New Users"      value={stats.newUsers}  max={Math.max(stats.newUsers, stats.returning, 1)} color="#10b981" />
              <BarRow label="Returning"      value={stats.returning} max={Math.max(stats.newUsers, stats.returning, 1)} color="#6366f1" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
