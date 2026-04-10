import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';


const STATUS_STYLES = {
  pending: 'bg-gray-200 text-gray-800',
  confirmed: 'bg-sky-100 text-sky-800',
  processing: 'bg-sky-100 text-sky-800',
  shipped: 'bg-earth/20 text-earth',
  delivered: 'bg-sage/20 text-sage-dark',
  cancelled: 'bg-error/10 text-error'
};

export function OrderCard({ order }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-brand-black">Order #{order.orderNumber}</p>
        <p className="text-xs text-gray-600">
          {format(new Date(order.createdAt), 'd MMM yyyy')} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        </p>
        <span className={cn('mt-1 inline-block w-fit rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-widest', STATUS_STYLES[order.status] ?? STATUS_STYLES.pending)}>
          {order.status}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-sm font-medium text-brand-black">{formatPrice(order.total)}</p>
        <Link
          href={ROUTES.order(order.id)}
          className="text-sm text-brand-black underline underline-offset-4 hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2">
          
          View
        </Link>
      </div>
    </div>);

}