import React, { useState } from 'react';

const DEFAULT_COLORS = [
  '#CE1E36', '#180D3E', '#7c3aed', '#2563eb',
  '#059669', '#d97706', '#0891b2', '#db2777',
  '#65a30d', '#ea580c'
];

const DonutChart = ({
  data,
  title,
  subtitle,
  totalValue,
  totalLabel,
  size = 160,
  strokeWidth = 22,
  showLegend = true,
  colors = DEFAULT_COLORS,
}) => {
  const [hovered, setHovered] = useState(null);
  const [expanded, setExpanded] = useState(false);

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="dc-chart-card">
        <div className="dc-chart-header">
          <p className="dc-chart-title">{title}</p>
          {subtitle && <p className="dc-chart-subtitle">{subtitle}</p>}
        </div>
        <div className="dc-chart-empty">No data available</div>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (total === 0) {
    return (
      <div className="dc-chart-card">
        <div className="dc-chart-header">
          <p className="dc-chart-title">{title}</p>
          {subtitle && <p className="dc-chart-subtitle">{subtitle}</p>}
        </div>
        <div className="dc-chart-empty">No data available</div>
      </div>
    );
  }

  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;

  let cum = 0;
  const segments = data.map((item, i) => {
    const pct = (item.value / total) * 100;
    const seg = {
      ...item,
      pct: pct.toFixed(1),
      color: item.color || colors[i % colors.length],
      dashArray: `${(pct / 100) * circ} ${circ}`,
      dashOffset: -((cum / 100) * circ),
    };
    cum += pct;
    return seg;
  });

  const ChartSVG = ({ s, sw, highlight }) => {
    const rr = (s - sw) / 2;
    const cc = 2 * Math.PI * rr;
    const ctr = s / 2;
    let c2 = 0;
    return (
      <svg width={s} height={s} className="dc-chart-svg">
        <circle cx={ctr} cy={ctr} r={rr} fill="none" stroke="#f0f0f5" strokeWidth={sw} />
        {segments.map((seg, i) => {
          const p = (seg.value / total) * 100;
          const da = `${(p / 100) * cc} ${cc}`;
          const doff = -((c2 / 100) * cc);
          c2 += p;
          return (
            <circle
              key={i}
              cx={ctr} cy={ctr} r={rr}
              fill="none"
              stroke={seg.color}
              strokeWidth={highlight === i ? sw + 3 : sw - 3}
              strokeDasharray={da}
              strokeDashoffset={doff}
              strokeLinecap="round"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                transform: `rotate(-90deg)`,
                transformOrigin: `${ctr}px ${ctr}px`,
                transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                opacity: highlight === null || highlight === i ? 1 : 0.45,
                cursor: 'pointer',
              }}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <>
      <div className="dc-chart-card" onClick={() => setExpanded(true)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setExpanded(true)}>
        <div className="dc-chart-header">
          <p className="dc-chart-title">{title}</p>
          {subtitle && <p className="dc-chart-subtitle">{subtitle}</p>}
        </div>

        <div className="dc-chart-body">
          {/* SVG donut */}
          <div className="dc-chart-donut-wrap">
            <ChartSVG s={size} sw={strokeWidth} highlight={hovered} />
            <div className="dc-chart-center">
              <div className="dc-chart-center-val">{totalValue}</div>
              <div className="dc-chart-center-lbl">{totalLabel}</div>
            </div>
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="dc-chart-legend">
              {segments.map((seg, i) => (
                <div
                  key={i}
                  className="dc-legend-row"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ opacity: hovered === null || hovered === i ? 1 : 0.45 }}
                >
                  <span className="dc-legend-dot" style={{ background: seg.color }} />
                  <div className="dc-legend-info">
                    <div className="dc-legend-top">
                      <span className="dc-legend-label">{seg.label}</span>
                      <span className="dc-legend-pct">{seg.pct}%</span>
                    </div>
                    <div className="dc-legend-bar-track">
                      <div className="dc-legend-bar-fill" style={{ width: `${seg.pct}%`, background: seg.color }} />
                    </div>
                    <span className="dc-legend-val">{seg.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dc-chart-hint">Click to expand</div>
      </div>

      {/* Expanded modal */}
      {expanded && (
        <div className="dc-modal-overlay" onClick={() => setExpanded(false)}>
          <div className="dc-modal" onClick={e => e.stopPropagation()}>
            <button className="dc-modal-close" onClick={() => setExpanded(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <div className="dc-modal-header">
              <p className="dc-modal-title">{title}</p>
              {subtitle && <p className="dc-modal-subtitle">{subtitle}</p>}
            </div>

            <div className="dc-modal-body">
              <div className="dc-modal-donut-wrap">
                <ChartSVG s={260} sw={34} highlight={hovered} />
                <div className="dc-modal-center">
                  <div className="dc-modal-center-val">{totalValue}</div>
                  <div className="dc-modal-center-lbl">{totalLabel}</div>
                </div>
              </div>

              <div className="dc-modal-legend">
                {segments.map((seg, i) => (
                  <div
                    key={i}
                    className="dc-modal-legend-row"
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ opacity: hovered === null || hovered === i ? 1 : 0.45 }}
                  >
                    <span className="dc-modal-legend-dot" style={{ background: seg.color }} />
                    <div className="dc-modal-legend-info">
                      <div className="dc-modal-legend-top">
                        <span className="dc-modal-legend-label">{seg.label}</span>
                        <span className="dc-modal-legend-pct">{seg.pct}%</span>
                      </div>
                      <div className="dc-legend-bar-track">
                        <div className="dc-legend-bar-fill" style={{ width: `${seg.pct}%`, background: seg.color }} />
                      </div>
                      <span className="dc-modal-legend-val">{seg.value.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DonutChart;
