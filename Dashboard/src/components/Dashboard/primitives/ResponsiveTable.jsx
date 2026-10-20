/**
 * ResponsiveTable — full table on desktop, stacked label/value cards
 * on mobile (<768px).
 *
 *   <ResponsiveTable
 *     columns={[
 *       { key: 'orderNo', label: 'Order #', render: (row) => row.order_number },
 *       { key: 'amount',  label: 'Amount',  render: (row) => `₹${row.amount}` },
 *       { key: 'status',  label: 'Status',  render: (row) => <Badge>{row.status}</Badge> },
 *     ]}
 *     data={orders}
 *     emptyMessage="No orders yet"
 *   />
 *
 * The mobile switch is implemented in pure CSS (primitives.css) using
 * the data-label attribute we attach to each <td>, so the same markup
 * works on the server during SSR.
 *
 * If you need a per-row click handler, pass onRowClick(row).
 * If you need a custom row key, pass rowKey="id" (default 'id').
 *
 * Pass `loading` while data loads: with no rows yet it draws the real header
 * plus shimmering rows (same columns); with rows on screen it keeps them,
 * dimmed, instead of flashing a skeleton (same as the shared ui/Table).
 */

import clsx from './_clsx';
import { SkeletonTableRows } from '../../ui/Skeleton';

export default function ResponsiveTable({
  columns,
  data,
  rowKey = 'id',
  onRowClick,
  emptyMessage = 'No data',
  className,
  loading = false,
  loadingLabel = 'Loading…',
  skeletonRows = 6,
}) {
  const head = (
    <thead>
      <tr>
        {columns.map((c) => (
          <th key={c.key} style={c.headerStyle}>{c.label}</th>
        ))}
      </tr>
    </thead>
  );

  if (loading && (!data || data.length === 0)) {
    return (
      <div className="ds-tablewrap" role="status" aria-busy="true">
        <span className="ds-sr-only">{loadingLabel}</span>
        <table className={clsx('ds-table', 'ds-table--auto', className)} aria-hidden="true">
          {head}
          <tbody>
            <SkeletonTableRows rows={skeletonRows} cols={columns.length} />
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="ds-empty" role="status" aria-live="polite">
        <div className="ds-empty__title">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div
      className="ds-tablewrap"
      aria-busy={loading || undefined}
      style={loading ? { opacity: 0.6, transition: 'opacity .15s' } : undefined}
    >
      <table className={clsx('ds-table', 'ds-table--auto', className)} role="table">
        {head}
        <tbody>
          {data.map((row, i) => (
            <tr
              key={typeof rowKey === 'function' ? rowKey(row, i) : (row[rowKey] ?? i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} data-label={c.label} style={c.cellStyle}>
                  {c.render ? c.render(row, i) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
