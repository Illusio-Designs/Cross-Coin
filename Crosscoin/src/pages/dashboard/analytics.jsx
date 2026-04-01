import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { brandSettingsService, brandService } from "../../services";

// LiveGlobe uses WebGL — load client-side only
const LiveGlobe = dynamic(
  () => import("../../components/common/LiveGlobe"),
  { ssr: false, loading: () => <div className="an-globe-loading">Loading globe…</div> }
);

const fmt   = n => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);

function StatCard({ label, value, delta, color }) {
  return (
    <div className="an-stat-card">
      <div className="an-stat-label">{label}</div>
      <div className="an-stat-value">{value}</div>
      {delta && <div className="an-stat-delta" style={{ color: color || "#16a34a" }}>{delta}</div>}
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
  const [mounted, setMounted]         = useState(false);
  const [stats, setStats]             = useState(null);
  const [pages, setPages]             = useState([]);
  const [sources, setSources]         = useState([]);
  const [topLocations, setTopLocations] = useState([]);
  const [brandId, setBrandId]         = useState(1);
  const [brands, setBrands]           = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  // GA4 config
  const [propertyId, setPropertyId]   = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showConfig, setShowConfig]   = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenErr, setTokenErr]       = useState("");

  useEffect(() => { setMounted(true); }, []);

  // Load brands + GA4 settings from brand settings
  useEffect(() => {
    if (!mounted) return;
    brandService.getAllBrands(true).then(r => {
      if (r.success && r.data.length > 0) {
        setBrands(r.data);
        setBrandId(r.data[0].id);
      }
    }).catch(() => {});
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !brandId) return;
    brandSettingsService.getSettingsByCategory(brandId, "analytics")
      .then(r => {
        const list = r.data || r || [];
        const pid = list.find(s => s.key === "GA4_PROPERTY_ID");
        if (pid?.value) {
          setPropertyId(pid.value);
          const authToken = typeof window !== "undefined" ? localStorage.getItem("token") : "";
          fetch(`/api/ga4-token?brandId=${brandId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
            .then(r => r.json())
            .then(data => { if (data.accessToken) setAccessToken(data.accessToken); })
            .catch(() => {});
        }
      }).catch(() => {});
  }, [mounted, brandId]);

  // Fetch real GA4 report data (today's stats)
  const fetchGA4Stats = useCallback(async () => {
    if (!accessToken || !propertyId) return;
    setStatsLoading(true);
    try {
      const baseUrl = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      // Main stats: sessions, pageviews, active users, bounce rate, avg session
      const mainRes = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: "today", endDate: "today" }],
          metrics: [
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "activeUsers" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
            { name: "newUsers" },
          ],
        }),
      });
      const mainData = await mainRes.json();
      const mv = mainData.rows?.[0]?.metricValues || [];
      const sessions   = parseInt(mv[0]?.value || "0", 10);
      const pageviews  = parseInt(mv[1]?.value || "0", 10);
      const active     = parseInt(mv[2]?.value || "0", 10);
      const bounceRate = (parseFloat(mv[3]?.value || "0") * 100).toFixed(1);
      const avgSession = Math.round(parseFloat(mv[4]?.value || "0"));
      const newUsers   = parseInt(mv[5]?.value || "0", 10);
      const returning  = Math.max(0, active - newUsers);

      // Compare yesterday for deltas
      const yestRes = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
          metrics: [{ name: "sessions" }],
        }),
      });
      const yestData = await yestRes.json();
      const yestSessions = parseInt(yestData.rows?.[0]?.metricValues?.[0]?.value || "1", 10);
      const sessionsDelta = yestSessions > 0
        ? `${sessions >= yestSessions ? "+" : ""}${(((sessions - yestSessions) / yestSessions) * 100).toFixed(1)}%`
        : "";

      setStats({ active, sessions, pageviews, bounceRate, avgSession, newUsers, returning, sessionsDelta });

      // Top pages
      const pagesRes = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: "today", endDate: "today" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 6,
        }),
      });
      const pagesData = await pagesRes.json();
      setPages((pagesData.rows || []).map(r => ({
        label: r.dimensionValues[0]?.value || "/",
        val: parseInt(r.metricValues[0]?.value || "0", 10),
      })));

      // Traffic sources
      const srcRes = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: "today", endDate: "today" }],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 5,
        }),
      });
      const srcData = await srcRes.json();
      setSources((srcData.rows || []).map(r => ({
        label: r.dimensionValues[0]?.value || "Other",
        val: parseInt(r.metricValues[0]?.value || "0", 10),
      })));

      // Top locations
      const locRes = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: "today", endDate: "today" }],
          dimensions: [{ name: "city" }, { name: "country" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 5,
        }),
      });
      const locData = await locRes.json();
      setTopLocations((locData.rows || []).map(r => ({
        name: `${r.dimensionValues[0]?.value} · ${r.dimensionValues[1]?.value}`,
        val: parseInt(r.metricValues[0]?.value || "0", 10),
      })));

    } catch (err) {
      console.error("[Analytics] GA4 fetch error:", err);
    }
    setStatsLoading(false);
  }, [accessToken, propertyId]);

  // Fetch stats when token is ready, then refresh every 5 min
  useEffect(() => {
    if (!accessToken || !propertyId) return;
    fetchGA4Stats();
    const t = setInterval(fetchGA4Stats, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [accessToken, propertyId, fetchGA4Stats]);

  // Manual connect button handler
  const connectGA4 = async () => {
    if (!propertyId) { setTokenErr("Property ID is required."); return; }
    setTokenLoading(true); setTokenErr("");
    try {
      const authToken = typeof window !== "undefined" ? localStorage.getItem("token") : "";
      const res = await fetch(`/api/ga4-token?brandId=${brandId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        setShowConfig(false);
      } else {
        setTokenErr(data.error || "Failed to get token.");
      }
    } catch (e) {
      setTokenErr("Network error.");
    }
    setTokenLoading(false);
  };

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
            <p className="sl-page-sub">Live traffic globe · Real-time visitor monitoring</p>
          </div>
        </div>
        <div className="sl-header-right">
          {brands.length > 1 && (
            <select className="bset-brand-select" value={brandId} onChange={e => setBrandId(Number(e.target.value))}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.display_name || b.name}</option>)}
            </select>
          )}
          <div className="an-live-pill">
            <span className="an-live-dot" />
            {accessToken ? "Live · GA4" : "Live · Demo"}
          </div>
          <button className="sl-add-btn" onClick={() => setShowConfig(true)}>
            {accessToken ? "✓ GA4 Connected" : "Connect GA4"}
          </button>
        </div>
      </div>

      {/* Globe */}
      {mounted && (
        <div style={{ marginBottom: 24, borderRadius: 16, overflow: "hidden" }}>
          <LiveGlobe
            propertyId={propertyId || "properties/000000000"}
            accessToken={accessToken}
            pollInterval={30000}
          />
        </div>
      )}

      {/* Stat cards */}
      {stats && (
        <div className="an-stats-row">
          <StatCard label="Active Users"    value={stats.active}                                    />
          <StatCard label="Sessions today"  value={fmt(stats.sessions)}  delta={stats.sessionsDelta} />
          <StatCard label="Pageviews"       value={fmt(stats.pageviews)}                            />
          <StatCard label="New Users"       value={fmt(stats.newUsers)}                             />
          <StatCard label="Returning"       value={fmt(stats.returning)}                            />
          <StatCard label="Bounce rate"     value={`${stats.bounceRate}%`} delta="today" color="#ef4444" />
        </div>
      )}
      {statsLoading && !stats && (
        <div style={{ textAlign: "center", padding: "32px", color: "#9ca3af" }}>Loading analytics…</div>
      )}
      {!accessToken && !statsLoading && (
        <div style={{ textAlign: "center", padding: "32px", color: "#9ca3af" }}>Connect GA4 to see real data.</div>
      )}

      {/* Bottom panels */}
      {stats && (
        <div className="an-bottom-grid">
          <div className="an-list-panel">
            <div className="an-list-title">Top Pages</div>
            <div className="an-list-rows">
              {pages.map((p, i) => <BarRow key={i} label={p.label} value={p.val} max={pages[0]?.val||1} color="#3b82f6" />)}
            </div>
          </div>
          <div className="an-list-panel">
            <div className="an-list-title">Traffic Sources</div>
            <div className="an-list-rows">
              {sources.map((s, i) => <BarRow key={i} label={s.label} value={s.val} max={sources[0]?.val||1} color="#8b5cf6" />)}
            </div>
          </div>
          <div className="an-list-panel">
            <div className="an-list-title">Top Locations</div>
            <div className="an-list-rows">
              {topLocations.map((l, i) => <BarRow key={i} label={l.name} value={l.val} max={topLocations[0]?.val||1} color="#10b981" />)}
            </div>
          </div>
          <div className="an-list-panel">
            <div className="an-list-title">Customers</div>
            <div className="an-list-rows">
              <BarRow label="New Users"  value={stats.newUsers}  max={Math.max(stats.newUsers, stats.returning)} color="#10b981" />
              <BarRow label="Returning"  value={stats.returning} max={Math.max(stats.newUsers, stats.returning)} color="#6366f1" />
            </div>
          </div>
          <div className="an-list-panel">
            <div className="an-list-title">Engagement</div>
            <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div style={{ fontSize:11, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".5px", marginBottom:4 }}>Avg Session</div>
                <div style={{ fontSize:28, fontWeight:700, color:"#111827" }}>{Math.floor(stats.avgSession/60)}m {stats.avgSession%60}s</div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".5px", marginBottom:4 }}>Bounce Rate</div>
                <div style={{ fontSize:28, fontWeight:700, color:"#ef4444" }}>{stats.bounceRate}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GA4 Config Modal */}
      {showConfig && (
        <div className="an-modal-bg">
          <div className="an-modal">
            <div className="an-modal-header">
              <h2 className="an-modal-title">Connect Google Analytics 4</h2>
              <button className="an-modal-x" onClick={() => setShowConfig(false)}>×</button>
            </div>
            <p className="an-modal-sub">
              Set <code>GA4_PROPERTY_ID</code>, <code>GA4_SA_EMAIL</code> and <code>GA4_SA_PRIVATE_KEY</code> in <strong>Brand Settings → Analytics</strong> category, then click Connect.
            </p>
            <div className="an-modal-fields">
              <input
                className="an-modal-input"
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                placeholder="GA4 Property ID (e.g. properties/123456789)"
              />
              {propertyId && (
                <div style={{ fontSize:12, color:"#16a34a", padding:"6px 10px", background:"#f0fdf4", borderRadius:6 }}>
                  ✓ Property ID loaded from Brand Settings
                </div>
              )}
            </div>
            {tokenErr && <p className="an-modal-err">{tokenErr}</p>}
            <div className="an-modal-footer">
              <button className="an-btn an-btn--ghost" onClick={() => setShowConfig(false)}>Cancel</button>
              <button className="an-btn an-btn--primary" onClick={connectGA4} disabled={tokenLoading}>
                {tokenLoading ? "Connecting…" : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
