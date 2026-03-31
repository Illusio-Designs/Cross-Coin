import { useCallback, useEffect, useMemo, useState } from "react";
import Globe from "../../components/magicui/globe";
import useTrafficPings from "../../hooks/use-traffic-pings";

// ─── City coords ──────────────────────────────────────────────────────────────
const CITY_COORDS = {
  "New York": [40.71, -74.01], London: [51.51, -0.13], Paris: [48.85, 2.35],
  Tokyo: [35.68, 139.69], Berlin: [52.52, 13.4], Sydney: [-33.87, 151.21],
  Toronto: [43.65, -79.38], Singapore: [1.35, 103.82], Mumbai: [19.08, 72.88],
  "Sao Paulo": [-23.55, -46.63], Delhi: [28.61, 77.21], "Los Angeles": [34.05, -118.24],
  Chicago: [41.88, -87.63], Dubai: [25.2, 55.27], Seoul: [37.57, 126.98],
  Ahmedabad: [23.03, 72.58], Surat: [21.17, 72.83], Bangalore: [12.97, 77.59],
};

const PAGES   = ["/", "/products", "/collections/sale", "/cart", "/about", "/blog"];
const SOURCES = ["Organic search", "Direct", "Social", "Email", "Referral"];
const SRC_W   = [0.44, 0.28, 0.15, 0.08, 0.05];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt    = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtSec = (s) => `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
const rnd    = (a, b) => Math.floor(Math.random() * (b - a + 1) + a);
const pick   = (arr) => arr[rnd(0, arr.length - 1)];

function demoStats() {
  return {
    active: rnd(90, 180), sessions: rnd(4200, 5400), pageviews: rnd(16000, 22000),
    avgSession: rnd(185, 280), bounceRate: 32 + Math.random() * 8,
    sessionsDelta: `+${rnd(5, 20)}%`, pageviewsDelta: `+${rnd(3, 15)}%`,
  };
}

function demoVisitors(count) {
  const cities = Object.keys(CITY_COORDS);
  return Array.from({ length: Math.min(count, 28) }, () => {
    const [lat, lng] = CITY_COORDS[pick(cities)];
    return { lat: lat + (Math.random() - 0.5) * 5, lng: lng + (Math.random() - 0.5) * 5, type: Math.random() < 0.15 ? "checkout" : "active" };
  });
}

async function fetchGA4(propertyId, token) {
  const base = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [rt, today, pages, sources] = await Promise.all([
    fetch(`${base}:runRealtimeReport`, { method: "POST", headers, body: JSON.stringify({ dimensions: [{ name: "country" }, { name: "city" }], metrics: [{ name: "activeUsers" }], minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }] }) }).then(r => r.json()),
    fetch(`${base}:runReport`, { method: "POST", headers, body: JSON.stringify({ dateRanges: [{ startDate: "today", endDate: "today" }, { startDate: "yesterday", endDate: "yesterday" }], metrics: [{ name: "sessions" }, { name: "screenPageViews" }, { name: "averageSessionDuration" }, { name: "bounceRate" }] }) }).then(r => r.json()),
    fetch(`${base}:runRealtimeReport`, { method: "POST", headers, body: JSON.stringify({ dimensions: [{ name: "unifiedScreenName" }], metrics: [{ name: "activeUsers" }], minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 5 }) }).then(r => r.json()),
    fetch(`${base}:runReport`, { method: "POST", headers, body: JSON.stringify({ dateRanges: [{ startDate: "today", endDate: "today" }], dimensions: [{ name: "sessionDefaultChannelGrouping" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 5 }) }).then(r => r.json()),
  ]);

  if (rt.error) throw new Error(rt.error.message);
  const active = (rt.rows || []).reduce((s, r) => s + parseInt(r.metricValues[0].value, 10), 0);
  const t = today.rows?.[0]?.metricValues || [];
  const y = today.rows?.[1]?.metricValues || [];
  const sessions = parseInt(t[0]?.value || "0", 10);
  const sessY    = parseInt(y[0]?.value || "1", 10);
  const pvs      = parseInt(t[1]?.value || "0", 10);
  const pvsY     = parseInt(y[1]?.value || "1", 10);
  const pct      = (a, b) => (((a - b) / b) * 100).toFixed(1);

  const visitors = (rt.rows || []).flatMap(row => {
    const city = row.dimensionValues[1].value;
    const count = parseInt(row.metricValues[0].value, 10);
    const coords = CITY_COORDS[city];
    if (!coords) return [];
    return Array.from({ length: Math.min(count, 3) }, (_, i) => ({
      lat: coords[0] + (Math.random() - 0.5) * 2,
      lng: coords[1] + (Math.random() - 0.5) * 2,
      type: i === 0 && Math.random() < 0.15 ? "checkout" : "active",
    }));
  });

  return {
    stats: { active, sessions, pageviews: pvs, avgSession: parseFloat(t[2]?.value || "0"), bounceRate: parseFloat(t[3]?.value || "0"), sessionsDelta: `${sessions >= sessY ? "+" : ""}${pct(sessions, sessY)}%`, pageviewsDelta: `${pvs >= pvsY ? "+" : ""}${pct(pvs, pvsY)}%` },
    visitors,
    pagesList:   (pages.rows   || []).map(r => ({ label: r.dimensionValues[0].value || "(not set)", val: parseInt(r.metricValues[0].value, 10) })),
    sourcesList: (sources.rows || []).map(r => ({ label: r.dimensionValues[0].value || "(not set)", val: parseInt(r.metricValues[0].value, 10) })),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, delta, deltaColor }) {
  return (
    <div className="an-stat-card">
      <div className="an-stat-value">{value}</div>
      <div className="an-stat-label">{label}</div>
      {delta && <div className="an-stat-delta" style={{ color: deltaColor || "#34d399" }}>{delta}</div>}
    </div>
  );
}

function ListPanel({ title, items }) {
  const max = Math.max(...items.map(i => i.val), 1);
  return (
    <div className="an-list-panel">
      <div className="an-list-title">{title}</div>
      <div className="an-list-rows">
        {items.map((item, idx) => (
          <div key={idx} className="an-list-row">
            <span className="an-list-rank">{idx + 1}</span>
            <span className="an-list-name">{item.label}</span>
            <div className="an-list-bar-wrap">
              <div className="an-list-bar" style={{ width: `${Math.round((item.val / max) * 100)}%` }} />
            </div>
            <span className="an-list-val">{fmt(item.val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigModal({ onClose, onSave }) {
  const [propertyId, setPropertyId] = useState("");
  const [token, setToken] = useState("");
  const [intervalSec, setIntervalSec] = useState(30);
  const [err, setErr] = useState("");
  return (
    <div className="an-modal-bg">
      <div className="an-modal">
        <h2 className="an-modal-title">Connect Google Analytics 4</h2>
        <p className="an-modal-sub">Enter your GA4 Property ID and OAuth Bearer token to show live data.</p>
        <div className="an-modal-fields">
          <input className="an-modal-input" value={propertyId} onChange={e => setPropertyId(e.target.value)} placeholder="Property ID (e.g. 123456789)" />
          <input className="an-modal-input" value={token} onChange={e => setToken(e.target.value)} placeholder="Bearer token" />
          <input className="an-modal-input" type="number" min={10} value={intervalSec} onChange={e => setIntervalSec(Number(e.target.value))} placeholder="Refresh interval (seconds)" />
        </div>
        {err && <p className="an-modal-err">{err}</p>}
        <div className="an-modal-footer">
          <button className="an-btn an-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="an-btn an-btn--primary" onClick={() => {
            if (!propertyId || !token) { setErr("Property ID and token are required."); return; }
            onSave({ propertyId, token, interval: Math.max(10, intervalSec) });
          }}>Connect</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function LiveAnalytics() {
  const [stats, setStats]     = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [pages, setPages]     = useState([]);
  const [sources, setSources] = useState([]);
  const [isDemo, setIsDemo]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cfg, setCfg]         = useState({ propertyId: "", token: "", interval: 30 });

  const markers = useTrafficPings(visitors);

  const tick = useCallback(async () => {
    if (isDemo) {
      const s = demoStats();
      setStats(s);
      setVisitors(demoVisitors(s.active));
      setPages(PAGES.map(p => ({ label: p, val: rnd(5, Math.max(8, Math.floor(s.active * 0.4))) })).sort((a, b) => b.val - a.val));
      setSources(SOURCES.map((src, i) => ({ label: src, val: Math.round(s.sessions * SRC_W[i]) })));
      return;
    }
    try {
      const data = await fetchGA4(cfg.propertyId, cfg.token);
      setStats(data.stats); setVisitors(data.visitors);
      setPages(data.pagesList); setSources(data.sourcesList);
    } catch (err) { console.error(err); }
  }, [isDemo, cfg]);

  useEffect(() => {
    tick();
    const timer = setInterval(tick, cfg.interval * 1000);
    return () => clearInterval(timer);
  }, [tick, cfg.interval]);

  const countryBreakdown = useMemo(() => {
    if (!stats) return [];
    return [
      ["India", "IN", 0.35], ["United States", "US", 0.17], ["United Kingdom", "UK", 0.12],
      ["UAE", "AE", 0.10], ["Germany", "DE", 0.08], ["Singapore", "SG", 0.07],
      ["Australia", "AU", 0.06], ["Canada", "CA", 0.05],
    ].map(([name, code, w]) => ({ name, code, val: Math.max(1, Math.floor(stats.active * w)) }));
  }, [stats]);

  return (
    <div className="dashboard-page">

      {/* ── Header ── */}
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
          <div className="an-live-pill">
            <span className="an-live-dot" />
            Live {isDemo ? "· Demo" : "· GA4"}
          </div>
          <button className="sl-add-btn" onClick={() => setShowModal(true)}>
            {isDemo ? "Connect GA4" : "✓ GA4 Connected"}
          </button>
        </div>
      </div>

      {/* ── Globe Hero (MagicUI GlobeDemo style) ── */}
      <div className="an-globe-hero">
        {/* Gradient text overlay */}
        <div className="an-globe-label">
          <span className="an-globe-count">{stats ? stats.active : "—"}</span>
          <span className="an-globe-count-sub">visitors right now</span>
        </div>

        {/* Globe — light mode config */}
        <Globe
          className="an-globe-canvas"
          markers={markers}
          phi={0.4}
          theta={0.25}
          config={{
            dark: 0,
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 1.8,
            mapBaseBrightness: 0.1,
            baseColor: [1, 1, 1],
            markerColor: [1, 0.5, 0.1],
            glowColor: [1, 1, 1],
            scale: 1,
          }}
        />

        {/* Bottom radial gradient overlay */}
        <div className="an-globe-overlay" />

        {/* Legend */}
        <div className="an-globe-legend">
          <span className="an-legend-item"><span className="an-legend-dot" style={{ background: "#34d399" }} />Active</span>
          <span className="an-legend-item"><span className="an-legend-dot" style={{ background: "#f59e0b" }} />Checkout</span>
          <span className="an-legend-item an-legend-refresh">updates every {cfg.interval}s</span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="an-stats-row">
        <StatCard label="Sessions today"  value={stats ? fmt(stats.sessions)  : "—"} delta={stats?.sessionsDelta}  deltaColor="#34d399" />
        <StatCard label="Pageviews"        value={stats ? fmt(stats.pageviews) : "—"} delta={stats?.pageviewsDelta} deltaColor="#34d399" />
        <StatCard label="Avg session"      value={stats ? fmtSec(stats.avgSession) : "—"} delta="on site" deltaColor="#9ca3af" />
        <StatCard label="Bounce rate"      value={stats ? `${stats.bounceRate.toFixed(1)}%` : "—"} delta="vs yesterday" deltaColor="#f87171" />
      </div>

      {/* ── Bottom panels ── */}
      <div className="an-bottom-grid">
        <ListPanel title="Top Pages" items={pages} />
        <ListPanel title="Traffic Sources" items={sources} />

        {/* Countries */}
        <div className="an-list-panel">
          <div className="an-list-title">Countries</div>
          <div className="an-list-rows">
            {countryBreakdown.map((c, idx) => (
              <div key={c.name} className="an-list-row">
                <span className="an-list-rank">{idx + 1}</span>
                <span className="an-list-name">{c.name}</span>
                <div className="an-list-bar-wrap">
                  <div className="an-list-bar" style={{ width: `${Math.round((c.val / (countryBreakdown[0]?.val || 1)) * 100)}%`, background: "#10b981" }} />
                </div>
                <span className="an-list-val">{c.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <ConfigModal
          onClose={() => setShowModal(false)}
          onSave={nextCfg => { setCfg(nextCfg); setIsDemo(false); setShowModal(false); }}
        />
      )}
    </div>
  );
}

export default LiveAnalytics;
