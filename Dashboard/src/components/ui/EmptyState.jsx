import clsx from '../Dashboard/primitives/_clsx';

/**
 * EmptyState — "nothing here yet" with a next step, instead of a bare
 * "No data" row.
 *
 *   <EmptyState
 *     title="No coupons yet"
 *     description="Make one for a sale or a WhatsApp offer."
 *     action={<Button>+ New coupon</Button>}
 *   />
 *
 * `message` is the older name for `description`; `icon` is optional;
 * `compact` for inside a panel or table.
 */
export default function EmptyState({ icon, title, description, message, action, compact = false, className }) {
  const text = description ?? message;
  return (
    <div className={clsx('ds-empty', compact && 'ds-empty--compact', className)} role="status">
      {icon && <div className="ds-empty__icon" aria-hidden="true">{icon}</div>}
      {title && <h3 className="ds-empty__title">{title}</h3>}
      {text && <p className="ds-empty__message">{text}</p>}
      {action && <div className="ds-empty__action">{action}</div>}
    </div>
  );
}
