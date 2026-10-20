import clsx from '../Dashboard/primitives/_clsx';

/**
 * Skeletons — grey shimmering shapes drawn WHERE the content will appear, so
 * the page keeps its layout while data loads (no centred spinners, no jumps).
 * One shimmer for the whole admin (styles/dashboard/ui-kit.css → .sk).
 *
 *   <Skeleton w="60%" h={14} />                       one bar
 *   <SkeletonText lines={3} />                        a paragraph
 *   <SkeletonKpis count={4} />                        a row of KPI tiles
 *   <SkeletonTable rows={8} cols={6} />               table body (header optional)
 *   <SkeletonCards count={6} media />                 card grid
 *   <SkeletonList rows={6} avatar />                  list / inbox rows
 *   <SkeletonForm fields={5} />                       side panel / settings form
 *   <SkeletonPage kpis={4} rows={8} />                header + tiles + table
 *
 * Rule of thumb: keep the real page header, tabs and filters on screen and
 * replace only the part that is loading. On a refresh with data already shown,
 * keep the old data instead of flashing a skeleton.
 */
export function Skeleton({ w, h = 12, r, circle = false, className, style }) {
  return (
    <span
      aria-hidden="true"
      className={clsx('sk', circle && 'sk--circle', className)}
      style={{ width: circle ? h : w, height: h, borderRadius: r, ...style }}
    />
  );
}

function Busy({ label, className, children, style }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-live="polite" style={style}>
      <span className="ds-sr-only">{label}</span>
      {children}
    </div>
  );
}

const WIDTHS = ['92%', '78%', '85%', '64%', '88%', '70%'];

export function SkeletonText({ lines = 3, label = 'Loading…', className }) {
  return (
    <Busy label={label} className={clsx('sk-text', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} h={12} w={i === lines - 1 && lines > 1 ? '55%' : WIDTHS[i % WIDTHS.length]} />
      ))}
    </Busy>
  );
}

export function SkeletonKpis({ count = 4, label = 'Loading figures…', className }) {
  return (
    <Busy label={label} className={clsx('sk-kpis', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="sk-kpi" aria-hidden="true">
          <Skeleton w="45%" h={10} />
          <Skeleton w="60%" h={22} />
          <Skeleton w="75%" h={10} />
        </div>
      ))}
    </Busy>
  );
}

/**
 * Table body placeholder. Pass `columns` (the real column defs or a number)
 * and `header` to draw the header row too — inside a real <table> use
 * <SkeletonTableRows> instead so the real header stays.
 */
export function SkeletonTable({ rows = 8, cols = 5, header = true, label = 'Loading rows…', className }) {
  const n = Array.isArray(cols) ? cols.length : cols;
  return (
    <Busy label={label} className={clsx('sk-table', className)}>
      {header && (
        <div className="sk-table__row sk-table__row--head" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {Array.from({ length: n }, (_, c) => <Skeleton key={c} w={c === 0 ? '50%' : '40%'} h={9} />)}
        </div>
      )}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-table__row" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {Array.from({ length: n }, (_, c) => (
            <Skeleton key={c} h={12} w={c === 0 ? WIDTHS[i % WIDTHS.length] : `${40 + ((i + c) % 4) * 12}%`} />
          ))}
        </div>
      ))}
    </Busy>
  );
}

/** <tr> placeholders for use inside an existing <tbody>. */
export function SkeletonTableRows({ rows = 8, cols = 5 }) {
  const n = Array.isArray(cols) ? cols.length : cols;
  return Array.from({ length: rows }, (_, i) => (
    <tr key={`sk-${i}`} className="sk-tr" aria-hidden="true">
      {Array.from({ length: n }, (_, c) => (
        <td key={c}><Skeleton h={12} w={c === 0 ? WIDTHS[i % WIDTHS.length] : `${40 + ((i + c) % 4) * 12}%`} /></td>
      ))}
    </tr>
  ));
}

export function SkeletonCards({ count = 6, media = true, minWidth = 230, label = 'Loading…', className }) {
  return (
    <Busy label={label} className={clsx('sk-cards', className)} style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${minWidth}px, 100%), 1fr))` }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="sk-card" aria-hidden="true">
          {media && <Skeleton className="sk-card__media" h="auto" r={10} />}
          <Skeleton w="70%" h={13} />
          <Skeleton w="45%" h={10} />
        </div>
      ))}
    </Busy>
  );
}

export function SkeletonList({ rows = 6, avatar = false, meta = true, label = 'Loading…', className }) {
  return (
    <Busy label={label} className={clsx('sk-list', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-list__row" aria-hidden="true">
          {avatar && <Skeleton circle h={36} />}
          <div className="sk-list__body">
            <Skeleton w={WIDTHS[i % WIDTHS.length]} h={12} />
            <Skeleton w="50%" h={10} />
          </div>
          {meta && <Skeleton w={56} h={10} />}
        </div>
      ))}
    </Busy>
  );
}

export function SkeletonForm({ fields = 4, label = 'Loading…', className }) {
  return (
    <Busy label={label} className={clsx('sk-form', className)}>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="sk-form__field" aria-hidden="true">
          <Skeleton w={`${25 + (i % 3) * 8}%`} h={10} />
          <Skeleton w="100%" h={38} r={10} />
        </div>
      ))}
    </Busy>
  );
}

/** A whole page: title, KPI tiles and a table — for page-level loading. */
export function SkeletonPage({ kpis = 4, rows = 8, cols = 5, label = 'Loading page…', className }) {
  return (
    <Busy label={label} className={clsx('sk-page', className)}>
      <div className="sk-page__head" aria-hidden="true">
        <Skeleton w={220} h={22} />
        <Skeleton w="min(520px, 80%)" h={12} />
      </div>
      {kpis > 0 && (
        <div className="sk-kpis" aria-hidden="true">
          {Array.from({ length: kpis }, (_, i) => (
            <div key={i} className="sk-kpi"><Skeleton w="45%" h={10} /><Skeleton w="60%" h={22} /><Skeleton w="75%" h={10} /></div>
          ))}
        </div>
      )}
      <div className="sk-panel" aria-hidden="true">
        <SkeletonTableBody rows={rows} cols={cols} />
      </div>
    </Busy>
  );
}

function SkeletonTableBody({ rows, cols }) {
  return (
    <div className="sk-table">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-table__row" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }, (_, c) => <Skeleton key={c} h={12} w={c === 0 ? WIDTHS[i % WIDTHS.length] : `${40 + ((i + c) % 4) * 12}%`} />)}
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
