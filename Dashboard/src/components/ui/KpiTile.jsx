import clsx from '../Dashboard/primitives/_clsx';
import { TONES } from './StatusPill';

/**
 * KpiTile — one number with its label. Put several in <KpiGrid> (wraps on
 * phones). Give it onClick to make it a filter: it becomes a button and
 * `selected` marks the active one (aria-pressed).
 *
 *   <KpiGrid>
 *     <KpiTile label="Out of stock" value={3} tone="problem" sub="sizes at 0"
 *              onClick={() => setFilter('out')} selected={filter === 'out'} />
 *     <KpiTile label="Net sales" value="₹1,24,560" trend="12% vs last month" trendDir="up" />
 *   </KpiGrid>
 *
 * tone colours the value with the StatusPill tones (done | progress | needs |
 * problem | neutral | marketing). The older StatTile tones (good, warn,
 * danger, info) are accepted and leave the value in the normal colour.
 * Also exported as StatTile / StatGrid from components/Dashboard/primitives.
 */
export function KpiGrid({ children, className, ...rest }) {
  return <div className={clsx('ds-stat-grid', className)} {...rest}>{children}</div>;
}

export default function KpiTile({
  label,
  value,
  tone,
  trend,
  trendDir,           // 'up' | 'down'
  sub,                // small secondary line
  prefix,
  suffix,
  icon,               // optional glyph, top-right
  onClick,
  selected = false,
  className,
  ...rest
}) {
  const Tag = onClick ? 'button' : 'div';
  const valueTone = TONES.includes(tone) ? tone : null;
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick, 'aria-pressed': !!selected } : {})}
      className={clsx('ds-stat', onClick && 'ds-stat--button', selected && 'is-selected', icon && 'ds-stat--has-icon', className)}
      {...rest}
    >
      {icon && <span className="ds-stat__icon" aria-hidden="true">{icon}</span>}
      <span className="ds-stat__label">{label}</span>
      <span className={clsx('ds-stat__value', valueTone && `ds-stat__value--${valueTone}`)}>
        {prefix}{value}{suffix}
      </span>
      {(trend || sub) && (
        <span className="ds-stat__foot">
          {trend && (
            <span className={clsx('ds-stat__trend', trendDir === 'up' && 'ds-stat__trend--up', trendDir === 'down' && 'ds-stat__trend--down')}>
              {trendDir === 'up' ? '▲' : trendDir === 'down' ? '▼' : ''} {trend}
            </span>
          )}
          {sub && <span className="ds-stat__sub">{sub}</span>}
        </span>
      )}
    </Tag>
  );
}
