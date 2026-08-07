/**
 * Panel — consistent card-shaped container.
 *
 * Named "Panel" instead of "Card" to avoid colliding with the legacy
 * Dashboard/Card.jsx (which is the home-page stat-card grid, kept
 * around until the home page is migrated to the design system).
 *
 *   <Panel title="Recent Orders" subtitle="Last 24h" actions={...}>
 *     ...
 *   </Panel>
 *
 * Variants:
 *   flush      — no internal padding (table rows handle their own)
 */

import clsx from './_clsx';

export default function Panel({
  title,
  subtitle,
  actions,
  children,
  flush = false,
  className,
  ...rest
}) {
  return (
    <section
      className={clsx('ds-card', flush && 'ds-card--flush', className)}
      {...rest}
    >
      {(title || actions) && (
        <header
          className="ds-card__header"
          style={flush ? { padding: '20px 20px 0' } : undefined}
        >
          <div>
            {title && <h2 className="ds-card__title">{title}</h2>}
            {subtitle && <div className="ds-card__subtitle">{subtitle}</div>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
