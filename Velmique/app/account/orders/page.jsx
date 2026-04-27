import Link from 'next/link';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

const mockOrders = [
  { id: 'VLQ-84321', date: 'March 10, 2026', status: 'Delivered', total: 28900, items: 1 },
  { id: 'VLQ-71205', date: 'February 22, 2026', status: 'In Transit', total: 46500, items: 2 },
  { id: 'VLQ-63847', date: 'January 15, 2026', status: 'Delivered', total: 17500, items: 1 },
];

const statusStyles = {
  Delivered: 'text-green-700 bg-green-100',
  'In Transit': 'text-[var(--gold-deep)] bg-[var(--gold)]/15',
  Processing: 'text-blue-700 bg-blue-100',
};

export default function OrdersPage() {
  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pt-10">
        <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)] font-body mb-8">
          <Link href="/account" className="hover:text-[var(--gold-deep)] transition-colors">Account</Link>
          <ChevronRight size={10} />
          <span className="text-[var(--ink)]">Orders</span>
        </div>
      </div>

      <PageHeader
        eyebrow="History"
        title="MY"
        accent="ORDERS"
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        <div className="space-y-3">
          {mockOrders.map(order => (
            <div key={order.id}
              className="bg-white border border-[var(--border)] hover:border-[var(--gold)] rounded-2xl p-6 transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[var(--gold-deep)] font-body text-sm tracking-[0.15em]">#{order.id}</p>
                  <p className="text-[var(--ink-muted)] text-xs font-body mt-1">{order.date} · {order.items} item{order.items > 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-5 flex-wrap">
                  <span className={`text-[10px] font-body px-3 py-1 rounded-full tracking-wider uppercase ${statusStyles[order.status]}`}>{order.status}</span>
                  <span className="font-serif italic text-[var(--ink)] text-2xl">₹{order.total}</span>
                  <Link href={`/account/orders`} className="text-[var(--ink-muted)] hover:text-[var(--gold-deep)] transition-colors">
                    <ArrowUpRight size={18} strokeWidth={1.6} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
