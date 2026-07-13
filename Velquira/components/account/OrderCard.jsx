import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';


const STATUS_STYLES = {
  pending: 'bg-[#f6efe0] text-[#8a6d1f]',
  confirmed: 'bg-[#f6efe0] text-[#8a6d1f]',
  processing: 'bg-[#f6efe0] text-[#8a6d1f]',
  shipped: 'bg-[#f6efe0] text-[#8a6d1f]',
  delivered: 'bg-[#eaf4ee] text-[#5f7a3c]',
  cancelled: 'bg-[#fbecec] text-[#b8472f]'
};

export function OrderCard({ order }) {
  const thumbs = (order.items ?? []).filter((it) => it?.image).slice(0, 4);

  return (
    <div className="flex flex-col gap-5 border-b border-line py-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="vq-display text-lg text-ink">Order #{order.orderNumber}</p>
          <p className="text-xs text-text-muted">
            {format(new Date(order.createdAt), 'd MMM yyyy')} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
          </p>
        </div>

        <span className={cn('inline-block w-fit rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em]', STATUS_STYLES[order.status] ?? STATUS_STYLES.pending)}>
          {order.status}
        </span>

        {thumbs.length > 0 &&
        <div className="mt-1 flex items-center gap-2">
            {thumbs.map((item, i) =>
          <span key={item.id ?? i} className="block h-12 w-12 overflow-hidden rounded-[2px] border border-line bg-cream">
                <img src={item.image} alt={item.name ?? ''} className="h-full w-full object-cover" />
              </span>
          )}
          </div>
        }
      </div>

      <div className="flex items-center justify-between gap-8 sm:justify-end">
        <p className="vq-display text-lg text-gold">{formatPrice(order.total)}</p>
        <Link
          href={ROUTES.order(order.id)}
          className="border-b border-line pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-ink transition-colors duration-300 hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">

          View Details →
        </Link>
      </div>
    </div>);

}
