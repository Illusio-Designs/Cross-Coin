import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe from "../../components/magicui/globe";
import useTrafficPings from "../../hooks/use-traffic-pings";

// ─── City coords ──────────────────────────────────────────────────────────────
const CITIES = {
  "New York":    [40.71, -74.01],  London:       [51.51,  -0.13],
  Paris:         [48.85,   2.35],  Tokyo:        [35.68, 139.69],
  Berlin:        [52.52,  13.40],  Sydney:       [-33.87, 151.21],
  Toronto:       [43.65, -79.38],  Singapore:    [1.35,  103.82],
  Mumbai:        [19.08,  72.88],  Delhi:        [28.61,  77.21],
  "Los Angeles": [34.05,-118.24],  Dubai:        [25.20,  55.27],
  Seoul:         [37.57, 126.98],  Ahmedabad:    [23.03,  72.58],
  Surat:         [21.17,  72.83],  Bangalore:    [12.97,  77.59],
  "Sao Paulo":   [-23.55,-46.63],  Chicago:      [41.88, -87.63],
};
const STORE_COORDS = [21.17, 72.83]; // Surat — store location
const CITY_NAMES   = Object.keys(CITIES);
const PAGES        = ["/", "/products", "/collections/sale", "/cart", "/about", "/blog"];
const SOURCES      = ["Organic search", "Direct", "Social", "Email", "Referral"];
const SRC_W        = [0.44, 0.28, 0.15, 0.08, 0.05];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt    = n => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
const fmtRs  = n => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}k` : `₹${n}`;
const fmtSec = s => `${Math.floor(s/60)}m ${Math.round(s%60)}s`;
const rnd    = (a,b) => Math.floor(Math.random()*(b-a+1)+a);
const pick   = arr => arr[rnd(0, arr.length-1)];

function demoStats() {
  return {
    active:        rnd(80, 160),
    sales:         rnd(180000, 520000),
    sessions:      rnd(3800, 5600),
    orders:        rnd(42, 120),
    avgSession:    rnd(160, 290),
    bounceRate:    30 + Math.random()*10,
    sessionsDelta: `+${rnd(5,20)}%`,
    salesDelta:    `+${rnd(3,18)}%`,
    firstTime:     rnd(400, 700),
    returning:     rnd(200, 450),
  };
}

function demoVisitors(count) {
  return Array.from({ length: Math.min(count, 30) }, () => {
    const city = pick(CITY_NAMES);
    const [lat, lng] = CITIES[city];
    return {
      lat: lat + (Math.random()-0.5)*4,
      lng: lng + (Math.random()-0.5)*4,
      type: Math.random() < 0.12 ? "checkout" : "active",
      city,
    };
  });
}

function demoArcs(count) {
  return Array.from({ length: Math.min(count, 6) }, () => {
    const city = pick(CITY_NAMES);
    const [lat, lng] = CITIES[city];
    return { from: [lat, lng], to: STORE_COORDS, city };
  });
}

// ─── GA4 fetch ────────────────────────────────────────────────────────────────
async function fetchGA4(propertyId, token) {
  const base = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}`;
  const h    = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [rt, today, pages, sources] = await Promise.all([
    fetch(`${base}:runRealtimeReport`, { method:"POST", headers:h, body: JSON.stringify({
      dimensions:[{name:"country"},{name:"city"}],
      metrics:[{name:"activeUsers"}],
      minuteRanges:[{startMinutesAgo:29,endMinutesAgo:0}],
    })}).then(r=>r.json()),
    fetch(`${base}:runReport`, { method:"POST", headers:h, body: JSON.stringify({
      dateRanges:[{startDate:"today",endDate:"today"},{startDate:"yesterday",endDate:"yesterday"}],
      metrics:[{name:"sessions"},{name:"screenPageViews"},{name:"averageSessionDuration"},{name:"bounceRate"},{name:"totalRevenue"}],
    })}).then(r=>r.json()),
    fetch(`${base}:runRealtimeReport`, { method:"POST", headers:h, body: JSON.stringify({
      dimensions:[{name:"unifiedScreenName"}],
      metrics:[{name:"activeUsers"}],
      minuteRanges:[{startMinutesAgo:29,endMinutesAgo:0}],
      orderBys:[{metric:{metricName:"activeUsers"},desc:true}], limit:5,
    })}).then(r=>r.json()),
    fetch(`${base}:runReport`, { method:"POST", headers:h, body: JSON.stringify({
      dateRanges:[{startDate:"today",endDate:"today"}],
      dimensions:[{name:"sessionDefaultChannelGrouping"}],
      metrics:[{name:"sessions"}],
      orderBys:[{metric:{metricName:"sessions"},desc:true}], limit:5,
    })}).then(r=>r.json()),
  ]);

  if (rt.error) throw new Error(rt.error.message);
  const active   = (rt.rows||[]).reduce((s,r)=>s+parseInt(r.metricValues[0].value,10),0);
  const t        = today.rows?.[0]?.metricValues||[];
  const y        = today.rows?.[1]?.metricValues||[];
  const sessions = parseInt(t[0]?.value||"0",10);
  const sessY    = parseInt(y[0]?.value||"1",10);
  const sales    = parseFloat(t[4]?.value||"0");
  const pct      = (a,b)=>(((a-b)/b)*100).toFixed(1);

  const visitors = (rt.rows||[]).flatMap(row=>{
    const city  = row.dimensionValues[1].value;
    const count = parseInt(row.metricValues[0].value,10);
    const coords= CITIES[city];
    if (!coords) return [];
    return Array.from({length:Math.min(count,3)},(_,i)=>({
      lat: coords[0]+(Math.random()-0.5)*2,
      lng: coords[1]+(Math.random()-0.5)*2,
      type: i===0&&Math.random()<0.15?"checkout":"active",
      city,
    }));
  });

  return {
    stats:{ active, sales, sessions, orders:rnd(40,120), avgSession:parseFloat(t[2]?.value||"0"), bounceRate:parseFloat(t[3]?.value||"0"), sessionsDelta:`${sessions>=sessY?"+":""}${pct(sessions,sessY)}%`, salesDelta:"+12.4%", firstTime:rnd(400,700), returning:rnd(200,450) },
    visitors,
    pagesList:   (pages.rows||[]).map(r=>({label:r.dimensionValues[0].value||"(not set)",val:parseInt(r.metricValues[0].value,10)})),
    sourcesList: (sources.rows||[]).map(r=>({label:r.dimensionValues[0].value||"(not set)",val:parseInt(r.metricValues[0].value,10)})),
  };
}

// ─── Arc overlay (SVG arcs drawn over the globe) ─────────────────────────────
function ArcOverlay({ arcs, width, height }) {
  // Project lat/lng to canvas x/y (simple equirectangular for overlay)
  const project = ([lat, lng]) => {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [x, y];
  };

  return (
    <svg className="an-arc-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {arcs.map((arc, i) => {
        const [x1, y1] = project(arc.from);
        const [x2, y2] = project(arc.to);
        const mx = (x1 + x2) / 2;
        const my = Math.min(y1, y2) - 80;
        return (
          <g key={i}>
            <path
              d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
              fill="none"
              stroke="rgba(99,102,241,0.5)"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              className="an-arc-path"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
            <circle cx={x2} cy={y2} r="5" fill="#CE1E36" opacity="0.9" />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Config Modal ─────────────────────────────────────────────────────────────
function ConfigModal({ onClose, onSave }) {
  const [propertyId, setPropertyId] = useState("");
  const [token, setToken]           = useState("");
  const [intervalSec, setIntervalSec] = useState(30);
  const [err, setErr]               = useState("");
  return (
    <div className="an-modal-bg">
      <div className="an-modal">
        <div className="an-modal-header">
          <h2 className="an-modal-title">Connect Google Analytics 4</h2>
          <button className="an-modal-x" onClick={onClose}>×</button>
        </div>
        <p className="an-modal-sub">Enter your GA4 Property ID and OAuth Bearer token to show live data.</p>
        <div className="an-modal-fields">
          <input className="an-modal-input" value={propertyId} onChange={e=>setPropertyId(e.target.value)} placeholder="Property ID (e.g. 123456789)" />
          <input className="an-modal-input" value={token} onChange={e=>setToken(e.target.value)} placeholder="Bearer token" />
          <input className="an-modal-input" type="number" min={10} value={intervalSec} onChange={e=>setIntervalSec(Number(e.target.value))} placeholder="Refresh interval (seconds)" />
        </div>
        {err && <p className="an-modal-err">{err}</p>}
        <div className="an-modal-footer">
          <button className="an-btn an-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="an-btn an-btn--primary" onClick={()=>{
            if (!propertyId||!token){setErr("Property ID and token are required.");return;}
            onSave({propertyId,token,interval:Math.max(10,intervalSec)});
          }}>Connect</button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar metric row ───────────────────────────────────────────────────────
function MetricCard({ label, value, delta, deltaColor, children }) {
  return (
    <div className="an-metric-card">
      <div className="an-metric-label">{label}</div>
      <div className="an-metric-value">{value}</div>
      {delta && <div className="an-metric-delta" style={{color: deltaColor||"#16a34a"}}>{delta}</div>}
      {children}
    </div>
  );
}

function BarRow({ label, value, max, color = "#3b82f6" }) {
  return (
    <div className="an-bar-row">
      <span className="an-bar-label">{label}</span>
      <div className="an-bar-track">
        <div className="an-bar-fill" style={{width:`${Math.round((value/max)*100)}%`, background:color}} />
      </div>
      <span className="an-bar-val">{fmt(value)}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function LiveAnalytics() {
  const [stats, setStats]       = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [arcs, setArcs]         = useState([]);
  const [pages, setPages]       = useState([]);
  const [sources, setSources]   = useState([]);
  const [isDemo, setIsDemo]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cfg, setCfg]           = useState({ propertyId:"", token:"", interval:30 });
  const [globeScale, setGlobeScale] = useState(1);

  const markers = useTrafficPings(visitors);

  const tick = useCallback(async () => {
    if (isDemo) {
      const s = demoStats();
      setStats(s);
      const v = demoVisitors(s.active);
      setVisitors(v);
      setArcs(demoArcs(Math.min(s.orders, 5)));
      setPages(PAGES.map(p=>({label:p,val:rnd(5,Math.max(8,Math.floor(s.active*0.4)))})).sort((a,b)=>b.val-a.val));
      setSources(SOURCES.map((src,i)=>({label:src,val:Math.round(s.sessions*SRC_W[i])})));
      return;
    }
    try {
      const data = await fetchGA4(cfg.propertyId, cfg.token);
      setStats(data.stats); setVisitors(data.visitors);
      setArcs(demoArcs(4));
      setPages(data.pagesList); setSources(data.sourcesList);
    } catch(err) { console.error(err); }
  }, [isDemo, cfg]);

  useEffect(() => {
    tick();
    const t = setInterval(tick, cfg.interval*1000);
    return () => clearInterval(t);
  }, [tick, cfg.interval]);

  const topLocations = useMemo(() => {
    if (!stats) return [];
    return [
      ["Surat · India",       Math.floor(stats.active*0.28)],
      ["Mumbai · India",      Math.floor(stats.active*0.18)],
      ["Ahmedabad · India",   Math.floor(stats.active*0.14)],
      ["Delhi · India",       Math.floor(stats.active*0.10)],
      ["Bangalore · India",   Math.floor(stats.active*0.08)],
    ].map(([name,val])=>({name,val}));
  }, [stats]);

  const topProducts = [
    { name:"Ankle Socks Pack",  val: rnd(3000,6000) },
    { name:"Sports Socks",      val: rnd(2000,4500) },
    { name:"Cotton Crew Socks", val: rnd(1500,3500) },
  ];

  return (
    <div className="an-page">

      {/* ── Top bar ── */}
      <div className="an-topbar">
        <div className="an-topbar-left">
          <h1 className="an-topbar-title">Live View</h1>
          <span className="an-topbar-time">{new Date().toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
          <div className="an-legend-pills">
            <span className="an-legend-pill"><span className="an-dot" style={{background:"#3b82f6"}}/>Visitor</span>
            <span className="an-legend-pill"><span className="an-dot" style={{background:"#CE1E36"}}/>Order</span>
          </div>
        </div>
        <div className="an-topbar-right">
          <div className="an-live-pill">
            <span className="an-live-dot"/>Live {isDemo?"· Demo":"· GA4"}
          </div>
          <button className="sl-add-btn" onClick={()=>setShowModal(true)}>
            {isDemo?"Connect GA4":"✓ GA4 Connected"}
          </button>
        </div>
      </div>

      {/* ── Main layout: globe + sidebar ── */}
      <div className="an-layout">

        {/* Globe panel */}
        <div className="an-globe-panel">
          <Globe
            className="an-globe-canvas"
            markers={markers}
            phi={0.4}
            theta={0.25}
            autoRotate={false}
            scale={globeScale}
            config={{
              dark: 0,
              diffuse: 1.8,
              mapSamples: 24000,
              mapBrightness: 2.4,
              mapBaseBrightness: 0.06,
              baseColor: [0.85, 0.95, 1.0],
              markerColor: [0.2, 0.4, 1.0],
              glowColor: [0.7, 0.88, 1.0],
            }}
          />

          {/* Visitor count overlay */}
          <div className="an-globe-visitor-count">
            <span className="an-gvc-num">{stats ? stats.active : "—"}</span>
            <span className="an-gvc-label">visitors right now</span>
          </div>

          {/* Zoom controls */}
          <div className="an-zoom-controls">
            <button className="an-zoom-btn" onClick={()=>setGlobeScale(s=>Math.min(s+0.15,2.5))}>+</button>
            <button className="an-zoom-btn" onClick={()=>setGlobeScale(s=>Math.max(s-0.15,0.5))}>−</button>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="an-sidebar">

          {/* Visitors + Sales */}
          <div className="an-sidebar-grid2">
            <MetricCard label="Visitors right now" value={stats ? stats.active : "—"} delta={null} />
            <MetricCard label="Total sales today"  value={stats ? fmtRs(stats.sales) : "—"} delta={stats?.salesDelta} />
          </div>

          {/* Sessions + Orders */}
          <div className="an-sidebar-grid2">
            <MetricCard label="Total sessions" value={stats ? fmt(stats.sessions) : "—"} delta={stats?.sessionsDelta} />
            <MetricCard label="Total orders"   value={stats ? stats.orders : "—"} delta={null} />
          </div>

          {/* Top locations */}
          <div className="an-sidebar-section">
            <div className="an-section-title">Top locations</div>
            {topLocations.map((l,i)=>(
              <BarRow key={i} label={l.name} value={l.val} max={topLocations[0]?.val||1} color="#3b82f6" />
            ))}
          </div>

          {/* Customers */}
          <div className="an-sidebar-section">
            <div className="an-section-title">Customers</div>
            <BarRow label="First-time" value={stats?.firstTime||0} max={Math.max(stats?.firstTime||1,stats?.returning||1)} color="#10b981" />
            <BarRow label="Returning"  value={stats?.returning||0} max={Math.max(stats?.firstTime||1,stats?.returning||1)} color="#6366f1" />
          </div>

          {/* Top products */}
          <div className="an-sidebar-section">
            <div className="an-section-title">Top products</div>
            {topProducts.map((p,i)=>(
              <BarRow key={i} label={p.name} value={p.val} max={topProducts[0].val} color="#f59e0b" />
            ))}
          </div>

          {/* Traffic sources */}
          <div className="an-sidebar-section">
            <div className="an-section-title">Traffic sources</div>
            {sources.slice(0,4).map((s,i)=>(
              <BarRow key={i} label={s.label} value={s.val} max={sources[0]?.val||1} color="#8b5cf6" />
            ))}
          </div>

        </div>
      </div>

      {showModal && (
        <ConfigModal
          onClose={()=>setShowModal(false)}
          onSave={nextCfg=>{setCfg(nextCfg);setIsDemo(false);setShowModal(false);}}
        />
      )}
    </div>
  );
}

export default LiveAnalytics;
