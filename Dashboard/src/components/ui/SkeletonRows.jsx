import clsx from '../Dashboard/primitives/_clsx';

const WIDTHS = ['72%', '58%', '66%', '48%', '62%'];

/**
 * SkeletonRows — grey placeholder rows while a list loads (never a blank
 * page). Screen readers hear `label`.
 *
 *   {isLoading ? <SkeletonRows rows={6} label="Loading coupons…" /> : <Table … />}
 */
export default function SkeletonRows({ rows = 5, label = 'Loading…', className }) {
  return (
    <div className={clsx('ui-skel', className)} role="status" aria-busy="true">
      <span className="ds-sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ui-skel__row" aria-hidden="true">
          <span className="ui-skel__bar" style={{ width: WIDTHS[i % WIDTHS.length] }} />
          <span className="ui-skel__bar ui-skel__bar--short" />
        </div>
      ))}
    </div>
  );
}
