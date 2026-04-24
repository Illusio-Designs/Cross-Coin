import Link from 'next/link';
import { Package, ChevronRight, ArrowRight } from 'lucide-react';

const mockOrders = [
  { id: 'VLQ-84321', date: 'March 10, 2026', status: 'Delivered', total: 289, items: 1 },
  { id: 'VLQ-71205', date: 'February 22, 2026', status: 'In Transit', total: 465, items: 2 },
  { id: 'VLQ-63847', date: 'January 15, 2026', status: 'Delivered', total: 175, items: 1 },
];

const statusColors = {
  Delivered: 'text-green-400 bg-green-400/10',
  'In Transit': 'text-[#d4927f] bg-[#b8624f]/10',
  Processing: 'text-blue-400 bg-blue-400/10',
};

export default function OrdersPage() {
  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-10">
        <div className="flex items-center gap-2 text-xs text-[#f3ede0]/30 font-body mb-8">
          <Link href="/account" className="hover:text-[#d4927f] transition-colors">Account</Link>
          <ChevronRight size={10} />
          <span className="text-[#f3ede0]/60">Orders</span>
        </div>
        <div className="mb-8">
          <p className="text-[#d4927f]/60 text-xs tracking-[0.3em] uppercase font-body mb-2">History</p>
          <h1 className="font-serif text-4xl text-[#f3ede0]">My Orders</h1>
          <div className="gold-divider w-16 mt-4" />
        </div>

        <div className="space-y-4">
          {mockOrders.map(order => (
            <div key={order.id} className="bg-[#1d1915] border border-[#b8624f]/10 hover:border-[#b8624f]/30 rounded-sm p-5 transition-all">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[#d4927f] font-body text-sm tracking-wider">#{order.id}</p>
                  <p className="text-[#f3ede0]/40 text-xs font-body mt-0.5">{order.date} · {order.items} item{order.items > 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-body px-3 py-1 rounded-full ${statusColors[order.status]}`}>{order.status}</span>
                  <span className="text-[#f3ede0] font-serif text-lg">${order.total}</span>
                  <Link href={`/account/orders`} className="text-[#d4927f]/60 hover:text-[#d4927f] transition-colors">
                    <ArrowRight size={16} />
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
