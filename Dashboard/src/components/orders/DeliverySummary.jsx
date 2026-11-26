import { useId } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { DeliveryTruck01Icon } from '@hugeicons/core-free-icons';

const number = new Intl.NumberFormat('en-IN');

export default function DeliverySummary({ title, metrics, action, loading }) {
  const headingId = useId();
  return (
    <section className="ds-delivery-summary" aria-labelledby={headingId} aria-busy={loading || undefined}>
      <div className="ds-delivery-summary__heading">
        <span className="ds-delivery-summary__icon" aria-hidden="true">
          <HugeiconsIcon icon={DeliveryTruck01Icon} size={20} strokeWidth={2} />
        </span>
        <h2 id={headingId}>{title}</h2>
        {action && <div className="ds-delivery-summary__action">{action}</div>}
      </div>
      <dl className="ds-delivery-summary__metrics">
        {metrics.map(({ label, value, attention }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={attention && value > 0 ? 'needs-attention' : undefined}>
              {value == null ? '—' : number.format(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
