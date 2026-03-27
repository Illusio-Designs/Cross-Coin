import { useCallback, useEffect, useMemo, useState } from "react";
import Globe from "../../components/magicui/globe";
import useTrafficPings from "../../hooks/use-traffic-pings";

const CITY_COORDS = {
  "New York": [40.71, -74.01],
  London: [51.51, -0.13],
  Paris: [48.85, 2.35],
  Tokyo: [35.68, 139.69],
  Berlin: [52.52, 13.4],
  Sydney: [-33.87, 151.21],
  Toronto: [43.65, -79.38],
  Singapore: [1.35, 103.82],
  Mumbai: [19.08, 72.88],
  "Sao Paulo": [-23.55, -46.63],
  Delhi: [28.61, 77.21],
  "Los Angeles": [34.05, -118.24],
  Chicago: [41.88, -87.63],
  Dubai: [25.2, 55.27],
  Seoul: [37.57, 126.98],
  Ahmedabad: [23.03, 72.58],
};

const PAGES = ["/", "/products", "/collections/sale", "/cart", "/about", "/blog"];
const SOURCES = ["Organic search", "Direct", "Social", "Email", "Referral"];
const SRC_W = [0.44, 0.28, 0.15, 0.08, 0.05];

function fmt(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function fmtSec(s) {
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}
function rnd(a, b) {
  return Math.floor(Math.random() * (b - a + 1) + a);
}
function pick(arr) {
  return arr[rnd(0, arr.length - 1)];
}

function demoStats() {
  return {
    active: rnd(90, 180),
    sessions: rnd(4200, 5400),
    pageviews: rnd(16000, 22000),
    avgSession: rnd(185, 280),
    bounceRate: 32 + Math.random() * 8,
    sessionsDelta: `+${rnd(5, 20)}%`,
    pageviewsDelta: `+${rnd(3, 15)}%`,
  };
}

function demoVisitors(count) {
  const cities = Object.keys(CITY_COORDS);
  return Array.from({ length: Math.min(count, 28) }, () => {
    const [lat, lng] = CITY_COORDS[pick(cities)];
    return {
      lat: lat + (Math.random() - 0.5) * 5,
      lng: lng + (Math.random() - 0.5) * 5,
      type: Math.random() < 0.15 ? "checkout" : "active",
    };
  });
}

async function fetchGA4(propertyId, token) {
  const base = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [rt, today, pages, sources] = await Promise.all([
    fetch(`${base}:runRealtimeReport`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dimensions: [{ name: "country" }, { name: "city" }],
        metrics: [{ name: "activeUsers" }],
        minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }],
      }),
    }).then((r) => r.json()),
    fetch(`${base}:runReport`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dateRanges: [
          { startDate: "today", endDate: "today" },
          { startDate: "yesterday", endDate: "yesterday" },
        ],
        metrics: [
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
        ],
      }),
    }).then((r) => r.json()),
    fetch(`${base}:runRealtimeReport`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dimensions: [{ name: "unifiedScreenName" }],
        metrics: [{ name: "activeUsers" }],
        minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 5,
      }),
    }).then((r) => r.json()),
    fetch(`${base}:runReport`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dateRanges: [{ startDate: "today", endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGrouping" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 5,
      }),
    }).then((r) => r.json()),
  ]);

  if (rt.error) throw new Error(rt.error.message);

  const active = (rt.rows || []).reduce((s, r) => s + parseInt(r.metricValues[0].value, 10), 0);
  const t = today.rows?.[0]?.metricValues || [];
  const y = today.rows?.[1]?.metricValues || [];
  const sessions = parseInt(t[0]?.value || "0", 10);
  const sessY = parseInt(y[0]?.value || "1", 10);
  const pvs = parseInt(t[1]?.value || "0", 10);
  const pvsY = parseInt(y[1]?.value || "1", 10);
  const pct = (a, b) => (((a - b) / b) * 100).toFixed(1);

  const visitors = (rt.rows || []).flatMap((row) => {
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
    stats: {
      active,
      sessions,
      pageviews: pvs,
      avgSession: parseFloat(t[2]?.value || "0"),
      bounceRate: parseFloat(t[3]?.value || "0"),
      sessionsDelta: `${sessions >= sessY ? "+" : ""}${pct(sessions, sessY)}%`,
      pageviewsDelta: `${pvs >= pvsY ? "+" : ""}${pct(pvs, pvsY)}%`,
    },
    visitors,
    pagesList: (pages.rows || []).map((r) => ({
      label: r.dimensionValues[0].value || "(not set)",
      val: parseInt(r.metricValues[0].value, 10),
    })),
    sourcesList: (sources.rows || []).map((r) => ({
      label: r.dimensionValues[0].value || "(not set)",
      val: parseInt(r.metricValues[0].value, 10),
    })),
  };
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 11, color: "#9ca3af" }}>{label}</span>
    </div>
  );
}

function ListPanel({ title, items, borderLeft }) {
  const max = Math.max(...items.map((i) => i.val), 1);
  return (
    <div style={{ padding: 16, borderLeft: borderLeft ? "1px solid rgba(255,255,255,.08)" : "none" }}>
      <p style={{ fontSize: 11, color: "#6b7280", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>{title}</p>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((item, idx) => (
          <div key={`${item.label}-${idx}`} style={{ display: "grid", gridTemplateColumns: "18px 1fr 70px 40px", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#6b7280", fontSize: 11 }}>{idx + 1}</span>
            <span style={{ color: "#e5e7eb", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
            <div style={{ height: 4, background: "rgba(255,255,255,.07)", borderRadius: 999 }}>
              <div style={{ height: "100%", width: `${Math.round((item.val / max) * 100)}%`, background: "#3b82f6", borderRadius: 999 }} />
            </div>
            <span style={{ color: "#9ca3af", fontSize: 11, textAlign: "right" }}>{fmt(item.val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigModal({ onClose, onSave }) {
  const [propertyId, setPropertyId] = useState("");
  const [token, setToken] = useState("");
  const [interval, setIntervalSec] = useState(30);
  const [err, setErr] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,.6)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 520, background: "#111115", border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, padding: 20 }}>
        <h2 style={{ color: "#fff", margin: 0, marginBottom: 6 }}>Connect Google Analytics 4</h2>
        <p style={{ margin: 0, marginBottom: 14, fontSize: 12, color: "#9ca3af" }}>
          Enter GA4 Property ID and OAuth token.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          <input value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="Property ID (e.g. 123456789)" style={inputStyle} />
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Bearer token" style={inputStyle} />
          <input type="number" min={10} value={interval} onChange={(e) => setIntervalSec(Number(e.target.value))} placeholder="Refresh seconds" style={inputStyle} />
        </div>
        {err ? <p style={{ color: "#f87171", marginTop: 8, marginBottom: 0, fontSize: 12 }}>{err}</p> : null}
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="apply-filter-btn" style={{ background: "#374151" }} onClick={onClose}>Cancel</button>
          <button
            className="apply-filter-btn"
            onClick={() => {
              if (!propertyId || !token) {
                setErr("Property ID and token are required.");
                return;
              }
              onSave({ propertyId, token, interval: Math.max(10, interval) });
            }}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.12)",
  color: "#e5e7eb",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
};

export default function LiveAnalytics() {
  const [stats, setStats] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [pages, setPages] = useState([]);
  const [sources, setSources] = useState([]);
  const [isDemo, setIsDemo] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cfg, setCfg] = useState({ propertyId: "", token: "", interval: 30 });

  const markers = useTrafficPings(visitors);

  const tick = useCallback(async () => {
    if (isDemo) {
      const s = demoStats();
      setStats(s);
      setVisitors(demoVisitors(s.active));
      setPages(
        PAGES.map((p) => ({ label: p, val: rnd(5, Math.max(8, Math.floor(s.active * 0.4))) })).sort((a, b) => b.val - a.val)
      );
      setSources(SOURCES.map((src, i) => ({ label: src, val: Math.round(s.sessions * SRC_W[i]) })));
      return;
    }

    try {
      const data = await fetchGA4(cfg.propertyId, cfg.token);
      setStats(data.stats);
      setVisitors(data.visitors);
      setPages(data.pagesList);
      setSources(data.sourcesList);
    } catch (err) {
      console.error(err);
    }
  }, [isDemo, cfg]);

  useEffect(() => {
    tick();
    const timer = setInterval(tick, cfg.interval * 1000);
    return () => clearInterval(timer);
  }, [tick, cfg.interval]);

  const countryBreakdown = useMemo(() => {
    if (!stats) return [];
    const list = [
      ["United States", "US", 0.35],
      ["United Kingdom", "UK", 0.17],
      ["India", "IN", 0.15],
      ["Germany", "DE", 0.1],
      ["Canada", "CA", 0.08],
      ["Australia", "AU", 0.06],
      ["Singapore", "SG", 0.05],
      ["UAE", "AE", 0.04],
    ];
    return list.map(([name, code, w]) => ({ name, code, val: Math.max(1, Math.floor(stats.active * w)) }));
  }, [stats]);

  return (
    <div className="dashboard-page">
      <div className="orders-header-container" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="seo-title" style={{ margin: 0 }}>Analytics</h1>
            <p style={{ margin: "6px 0 0 0", color: "#6b7280", fontSize: 12 }}>
              Live traffic globe and real-time visitor monitoring
            </p>
          </div>
          <button className="apply-filter-btn" onClick={() => setShowModal(true)}>
            {isDemo ? "Connect GA4" : "GA4 Connected"}
          </button>
        </div>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, overflow: "hidden", background: "#09090b", color: "#f9fafb" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10 }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "999px", background: "#34d399", opacity: 0.6, animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
              <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10, borderRadius: "999px", background: "#10b981" }} />
            </span>
            <strong style={{ fontSize: 13 }}>Live view {isDemo ? "(Demo)" : ""}</strong>
          </div>
          <span style={{ color: "#9ca3af", fontSize: 11 }}>updates every {cfg.interval}s</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", minHeight: 620 }}>
          <div style={{ borderRight: "1px solid rgba(255,255,255,.08)", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "relative", height: 420 }}>
              <div style={{ position: "absolute", top: 20, left: 20, zIndex: 3 }}>
                <p style={{ margin: 0, fontSize: 56, lineHeight: 1, fontWeight: 700 }}>{stats ? stats.active : "-"}</p>
                <p style={{ margin: "6px 0 0 0", color: "#6b7280", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>
                  visitors right now
                </p>
              </div>

              <div style={{ position: "absolute", bottom: 14, left: 20, zIndex: 3, display: "flex", gap: 18 }}>
                <LegendItem color="#34d399" label="Active" />
                <LegendItem color="#f59e0b" label="Checkout" />
              </div>

              <Globe className="absolute inset-0 w-full h-full" markers={markers} phi={0.4} theta={0.25} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.08)" }}>
              {[
                { label: "Sessions today", val: stats ? fmt(stats.sessions) : "-", delta: stats?.sessionsDelta, color: "#34d399" },
                { label: "Pageviews", val: stats ? fmt(stats.pageviews) : "-", delta: stats?.pageviewsDelta, color: "#34d399" },
                { label: "Avg session", val: stats ? fmtSec(stats.avgSession) : "-", delta: "on site", color: "#9ca3af" },
                { label: "Bounce rate", val: stats ? `${stats.bounceRate.toFixed(1)}%` : "-", delta: "vs yesterday", color: "#f87171" },
              ].map((c, idx) => (
                <div key={c.label} style={{ padding: 14, borderRight: idx < 3 ? "1px solid rgba(255,255,255,.08)" : "none" }}>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{c.val}</p>
                  <p style={{ margin: "2px 0 0 0", color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" }}>{c.label}</p>
                  <p style={{ margin: "6px 0 0 0", color: c.color, fontSize: 11 }}>{c.delta || "-"}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid rgba(255,255,255,.08)", flex: 1 }}>
              <ListPanel title="Top pages" items={pages} />
              <ListPanel title="Traffic sources" items={sources} borderLeft />
            </div>
          </div>

          <div>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>Countries</p>
            </div>
            <div style={{ padding: 12, display: "grid", gap: 7 }}>
              {countryBreakdown.map((c) => (
                <div key={c.name} style={{ display: "grid", gridTemplateColumns: "1fr 60px 36px", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                  <div style={{ height: 4, background: "rgba(255,255,255,.07)", borderRadius: 999 }}>
                    <div style={{ height: "100%", width: `${Math.round((c.val / Math.max(countryBreakdown[0]?.val || 1, 1)) * 100)}%`, background: "#10b981", borderRadius: 999 }} />
                  </div>
                  <span style={{ color: "#9ca3af", fontSize: 11, textAlign: "right" }}>{c.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <ConfigModal
          onClose={() => setShowModal(false)}
          onSave={(nextCfg) => {
            setCfg(nextCfg);
            setIsDemo(false);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

