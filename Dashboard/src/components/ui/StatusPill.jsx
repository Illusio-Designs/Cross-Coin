import clsx from '../Dashboard/primitives/_clsx';

/**
 * StatusPill — one colour language for every status in the admin.
 *
 *   done       delivered, paid, approved, refunded
 *   progress   shipped, booked, sending, waiting on the courier
 *   needs      to confirm, refund due, waiting for a reply, low stock
 *   problem    failed, RTO, out of stock, rejected
 *   neutral    draft, cancelled, hidden, inactive
 *   marketing  campaigns, coupons, loyalty
 *
 *   <StatusPill tone="needs">To confirm</StatusPill>
 *   <StatusPill tone={statusTone(row.status)}>{row.status}</StatusPill>
 */
export const TONES = ['done', 'progress', 'needs', 'problem', 'neutral', 'marketing'];

// Common raw status words → tone. Pages with their own wording map
// explicitly (see OrderStatusBadge); this covers the everyday ones.
const STATUS_TONE = {
  delivered: 'done', paid: 'done', captured: 'done', approved: 'done', refunded: 'done', active: 'done',
  published: 'done', synced: 'done', sent: 'done', read: 'done', ok: 'done', success: 'done', completed: 'done',
  shipped: 'progress', 'in transit': 'progress', in_transit: 'progress', 'out for delivery': 'progress', booked: 'progress',
  processing: 'progress', confirmed: 'progress', sending: 'progress', scheduled: 'progress', running: 'progress',
  pickup_scheduled: 'progress', picked_up: 'progress', syncing: 'progress',
  pending: 'needs', awaiting_confirmation: 'needs', to_confirm: 'needs', refund_due: 'needs', refund_pending: 'needs',
  requested: 'needs', under_review: 'needs', received: 'needs', low_stock: 'needs', partial: 'needs',
  failed: 'problem', rto: 'problem', undelivered: 'problem', rejected: 'problem', out_of_stock: 'problem',
  exception: 'problem', error: 'problem', expired: 'problem',
  draft: 'neutral', cancelled: 'neutral', 'order cancelled': 'neutral', hidden: 'neutral', inactive: 'neutral',
  archived: 'neutral', skipped: 'neutral', closed: 'neutral',
};

/** Tone for a raw status string (case/space-insensitive); 'neutral' if unknown. */
export function statusTone(status) {
  const k = String(status || '').trim().toLowerCase();
  return STATUS_TONE[k] || STATUS_TONE[k.replace(/\s+/g, '_')] || 'neutral';
}

export default function StatusPill({ tone = 'neutral', dot = false, size = 'md', className, children, ...rest }) {
  const t = TONES.includes(tone) ? tone : 'neutral';
  return (
    <span className={clsx('ui-pill', `ui-pill--${t}`, size === 'sm' && 'ui-pill--sm', className)} {...rest}>
      {dot && <span className="ui-pill__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
