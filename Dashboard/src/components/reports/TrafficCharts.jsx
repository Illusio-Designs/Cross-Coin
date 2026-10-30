import React, { useEffect, useRef, useState } from 'react';

/* ──────────────────────────────────────────────────────────────
   Charts for the Traffic page — no tables: hero tiles with a
   sparkline, vertical bars, horizontal bars, donuts and the
   Lighthouse-style visit-check gauge. Every card carries an ⓘ
   button that opens a short explanation. Plain SVG/HTML, colours
   from the --ds tokens (light + dark) and the validated chart
   series order in reports.css (.tr2-*).
   ────────────────────────────────────────────────────────────── */

export const SERIES = ['var(--tr2-s1)', 'var(--tr2-s2)', 'var(--tr2-s3)', 'var(--tr2-s4)', 'var(--tr2-s5)', 'var(--tr2-s6)', 'var(--tr2-s7)', 'var(--tr2-s8)'];
const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN');
// A tooltip body: one string, or an array of lines.
const lines = (t) => (Array.isArray(t) ? t : [t]).map((l, i) => <React.Fragment key={i}><br />{l}</React.Fragment>);

/* One shared hover tooltip that follows the pointer. */
function useTip() {
  const [tip, setTip] = useState(null);
  const show = (e, html) => setTip({ x: e.clientX, y: e.clientY, html });
  const hide = () => setTip(null);
  const node = tip ? <Tip {...tip} /> : null;
  return { show, hide, node };
}
function Tip({ x, y, html }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x + 14, top: y + 14 });
  useEffect(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    let left = x + 14, top = y + 14;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    setPos({ left, top });
  }, [x, y]);
  return <div ref={ref} className="tr2-tip" style={pos} role="tooltip">{html}</div>;
}

/* ⓘ button + popover. One open at a time page-wide; Esc or a click
   elsewhere closes it. */
let closeOpenInfo = null;
export function InfoButton({ title, children }) {
  const [open, setOpen] = useState(false);
  const btn = useRef(null);
  const pop = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    if (closeOpenInfo && closeOpenInfo !== close) closeOpenInfo();
    closeOpenInfo = close;
    const onDoc = (e) => { if (!pop.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      if (closeOpenInfo === close) closeOpenInfo = null;
    };
  }, [open]);
  return (
    <>
      <button ref={btn} type="button" className="tr2-ib" aria-label={`About ${title}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>i</button>
      {open ? (
        <div ref={pop} className="tr2-pop" role="note">
          <b>{title}</b>
          {children}
        </div>
      ) : null}
    </>
  );
}

/* A chart card: title, ⓘ, optional hint, body. */
export function ChartCard({ title, info, hint, span = 4, children, style, busy }) {
  return (
    <section className={`tr2-card tr2-c${span}`} style={style} aria-busy={busy}>
      <div className="tr2-ch">
        <span className="tr2-ht"><h3>{title}</h3>{info ? <InfoButton title={title}>{info}</InfoButton> : null}</span>
        {hint ? <span className="tr2-hint">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }) {
  return <p className="tr2-empty">{children}</p>;
}

/* Hero number tile with a sparkline. */
export function KpiTile({ label, value, foot, series = [], color = 'var(--tr2-s1)', info }) {
  const W = 200, H = 34;
  const max = Math.max(0, ...series);
  const pts = series.length > 1 ? series.map((v, i) => [(i / (series.length - 1)) * W, H - 3 - (max ? (v / max) * (H - 8) : 0)]) : [];
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <div className="tr2-kpi">
      <span className="tr2-kh"><span className="rep-kl">{label}</span>{info ? <InfoButton title={label}>{info}</InfoButton> : null}</span>
      <span className="tr2-kv num">{value}</span>
      {foot ? <span className="rep-kf">{foot}</span> : null}
      {pts.length ? (
        <svg className="tr2-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {max ? <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={color} opacity="0.12" /> : null}
          <path d={line} fill="none" stroke={max ? color : 'var(--ds-color-text-faint)'} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
}

const niceMax = (v) => {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
};

/* Vertical bars, one series, baseline-anchored with 4px rounded tops. */
export function VBars({ data, unit = 'visits', color = 'var(--tr2-s1)', labelEvery = 1 }) {
  const { show, hide, node } = useTip();
  const [on, setOn] = useState(null);
  const W = 760, H = 230, L = 36, B = 26, T = 10;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const slot = (W - L) / Math.max(1, data.length);
  const bw = Math.min(34, Math.max(2, slot - 6));
  return (
    <div className="tr2-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={data.map((d) => `${d.full || d.label} ${d.value} ${unit}`).join(', ')}>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (max / 4) * i, y = H - B - (v / max) * (H - B - T);
          return (
            <g key={i}>
              <line className="tr2-gl" x1={L} x2={W} y1={y} y2={y} />
              <text className="tr2-axis" x={L - 8} y={y + 4} textAnchor="end">{fmt(v)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - B - T), x = L + i * slot + (slot - bw) / 2, y = H - B - h, r = Math.min(4, h);
          const path = h > 0 ? `M${x} ${H - B} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + bw - r} Q${x + bw} ${y} ${x + bw} ${y + r} V${H - B} Z` : '';
          return (
            <g key={d.label + i}>
              {path ? <path d={path} fill={color} className="tr2-mark" opacity={on == null || on === i ? 1 : 0.35} /> : null}
              {i % labelEvery === 0 ? <text className="tr2-axis" x={x + bw / 2} y={H - 8} textAnchor="middle">{d.label}</text> : null}
              <rect className="tr2-hit" x={L + i * slot} y={T} width={slot} height={H - B - T}
                onMouseMove={(e) => { setOn(i); show(e, <><b>{d.full || d.label}</b><br />{fmt(d.value)} {unit}{d.extra ? <><br />{d.extra}</> : null}</>); }}
                onMouseLeave={() => { setOn(null); hide(); }} />
            </g>
          );
        })}
      </svg>
      {node}
    </div>
  );
}

/* Horizontal bars in HTML so text stays one size in any card. */
export function HBars({ data, unit = 'visits', color = 'var(--tr2-s1)', max: maxIn }) {
  const { show, hide, node } = useTip();
  const [on, setOn] = useState(null);
  const max = maxIn || Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="tr2-hb" role="list">
      {data.map((d, i) => (
        <div key={d.name + i} className="tr2-hb-row" role="listitem"
          onMouseMove={(e) => { setOn(i); show(e, <><b>{d.name}</b>{lines(d.tip || `${fmt(d.value)} ${unit}`)}</>); }}
          onMouseLeave={() => { setOn(null); hide(); }}>
          <div className="tr2-hb-top"><span className="tr2-hb-name">{d.name}</span><span className="tr2-hb-val num">{d.text ?? fmt(d.value)}</span></div>
          <div className="tr2-hb-track">
            <i className="tr2-hb-fill" style={{ width: `${d.value > 0 ? Math.max(1.2, (d.value / max) * 100) : 0}%`, background: d.color || color, opacity: on == null || on === i ? 1 : 0.35 }} />
          </div>
        </div>
      ))}
      {node}
    </div>
  );
}

/* Donut with 2px gaps between slices, a centre figure and a legend
   carrying every value (identity is never colour alone). */
export function Donut({ data, centre, sub, unit = 'visits' }) {
  const { show, hide, node } = useTip();
  const [on, setOn] = useState(null);
  const total = data.reduce((a, d) => a + (Number(d.value) || 0), 0);
  const R = 80, r = 54, C = 95, GAP = 0.012;
  const p = (rad, ang) => `${(C + rad * Math.cos(ang)).toFixed(2)} ${(C + rad * Math.sin(ang)).toFixed(2)}`;
  let a0 = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const frac = total ? (Number(d.value) || 0) / total : 0;
    const a1 = a0 + frac * Math.PI * 2;
    let path = '';
    if (frac >= 0.999) {
      const e = Math.PI * 1.5 - 0.0001;
      path = `M${p(R, -Math.PI / 2)} A${R} ${R} 0 1 1 ${p(R, e)} L${p(r, e)} A${r} ${r} 0 1 0 ${p(r, -Math.PI / 2)} Z`;
    } else if (frac > 0) {
      const s = a0 + GAP, e = Math.max(s + 0.004, a1 - GAP), big = e - s > Math.PI ? 1 : 0;
      path = `M${p(R, s)} A${R} ${R} 0 ${big} 1 ${p(R, e)} L${p(r, e)} A${r} ${r} 0 ${big} 0 ${p(r, s)} Z`;
    }
    a0 = a1;
    return { ...d, frac, path, color: d.color || SERIES[i % SERIES.length] };
  });
  const pctTxt = (f) => { const v = f * 100; return v > 0 && v < 1 ? v.toFixed(1) : Math.round(v); };
  return (
    <div className="tr2-donut">
      <svg viewBox="0 0 190 190" role="img" aria-label={slices.map((s) => `${s.name} ${s.value}`).join(', ')}>
        <circle cx={C} cy={C} r={(R + r) / 2} fill="none" stroke="var(--ds-color-surface-soft)" strokeWidth={R - r} />
        {slices.map((s, i) => (s.path ? (
          <path key={s.name} d={s.path} fill={s.color} opacity={on == null || on === i ? 1 : 0.35}
            onMouseMove={(e) => { setOn(i); show(e, <><b>{s.name}</b><br />{fmt(s.value)} {unit} · {pctTxt(s.frac)}%</>); }}
            onMouseLeave={() => { setOn(null); hide(); }} />
        ) : null))}
        <text className="tr2-dnum" x={C} y={C + 6}>{centre ?? fmt(total)}</text>
        <text className="tr2-dsub" x={C} y={C + 24}>{sub}</text>
      </svg>
      <ul className="tr2-legend">
        {slices.map((s) => (
          <li key={s.name}>
            <i className="tr2-sw" style={{ background: s.color }} />
            <span className="tr2-nm">{s.name}</span>
            <span className="tr2-n num">{fmt(s.value)}<span className="tr2-p">{pctTxt(s.frac)}%</span></span>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
}

/* Lighthouse-style gauge: every check a segment of one ring. */
export const gaugeTone = (p) => (p == null ? 'none' : p >= 80 ? 'good' : p >= 50 ? 'warn' : 'bad');
export function VisitGauge({ total, checks }) {
  const CX = 200, CY = 200, R = 160, GAP = 7;
  const pt = (rr, deg) => { const a = ((deg - 90) * Math.PI) / 180; return [CX + rr * Math.cos(a), CY + rr * Math.sin(a)]; };
  const arc = (f, t) => {
    const a = pt(R, f), b = pt(R, t);
    return `M${a[0].toFixed(2)} ${a[1].toFixed(2)} A${R} ${R} 0 ${t - f > 180 ? 1 : 0} 1 ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
  };
  const span = 360 / checks.length;
  return (
    <svg className="rep-vc-gauge" viewBox="-110 -40 620 480" role="img"
      aria-label={`${total} tracked visits. ${checks.map((c) => `${c.name} ${c.pct == null ? 'not known' : `${c.pct}%`}`).join(', ')}`}>
      <circle className="rep-vc-core" cx={CX} cy={CY} r={R - 22} />
      <text className="rep-vc-num" x={CX} y={CY - 8}>{fmt(total)}</text>
      <text className="rep-vc-sub" x={CX} y={CY + 40}>tracked visits</text>
      {checks.map((c, i) => {
        const s = i * span + GAP / 2 + 3, e = (i + 1) * span - GAP / 2 - 3;
        const tone = gaugeTone(c.pct);
        const p = pt(R + 38, (s + e) / 2);
        const anchor = Math.abs(p[0] - CX) < 24 ? 'middle' : p[0] > CX ? 'start' : 'end';
        return (
          <g key={c.key} className={`rep-vc-${tone}`}>
            <path className="rep-vc-track" d={arc(s, e)} />
            {c.pct > 0 ? <path className="rep-vc-seg" d={arc(s, s + ((e - s) * c.pct) / 100)} /> : null}
            <text className="rep-vc-lab" x={p[0].toFixed(1)} y={p[1].toFixed(1)} textAnchor={anchor} dominantBaseline="middle">
              {c.key} <tspan className="rep-vc-labpct">{c.pct == null ? '—' : `${c.pct}%`}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
