/**
 * StatTile — a single KPI tile. Use inside <StatGrid> for a responsive
 * grid that wraps neatly on phones.
 *
 *   <StatGrid>
 *     <StatTile label="Revenue" value="₹1.2L" trend="+8%" trendDir="up" sub="vs last week" />
 *     <StatTile label="Orders"  value={42}    tone="good" />
 *   </StatGrid>
 *
 * tone: 'default' | 'good' | 'warn' | 'danger' | 'info'  → recolours
 *       the left border so admins can spot status at a glance.
 */

import clsx from './_clsx';

export function StatGrid({ children, className, ...rest }) {
  return <div className={clsx('ds-stat-grid', className)} {...rest}>{children}</div>;
}

export default function StatTile({
  label,
  value,
  tone = 'default',
  trend,
  trendDir,           // 'up' | 'down'
  sub,                // small secondary text (e.g. "vs last week")
  prefix,
  suffix,
  ...rest
}) {
  return (
    <div
      className={clsx('ds-stat', tone !== 'default' && `ds-stat--${tone}`)}
      {...rest}
    >
      <div className="ds-stat__label">{label}</div>
      <div className="ds-stat__value">
        {prefix}{value}{suffix}
      </div>
      {(trend || sub) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          {trend && (
            <span
              className={clsx(
                'ds-stat__trend',
                trendDir === 'up' && 'ds-stat__trend--up',
                trendDir === 'down' && 'ds-stat__trend--down',
              )}
            >
              {trendDir === 'up' ? '▲' : trendDir === 'down' ? '▼' : ''} {trend}
            </span>
          )}
          {sub && <span className="ds-stat__sub">{sub}</span>}
        </div>
      )}
    </div>
  );
}
