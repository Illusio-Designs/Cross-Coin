
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

import { getOrders } from '@/lib/api/orders';
import { OrderCard } from '@/components/account/OrderCard';

export const metadata = { title: 'My Orders' };

export default async function OrdersPage() {
  let orders = [];
  try {orders = await getOrders();} catch {/* fallback */}

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-normal text-brand-black">Orders</h1>

      {orders.length === 0 ?
      <div className="flex flex-col items-center gap-4 py-20 text-center">
          <ShoppingBag size={40} className="text-gray-200" />
          <p className="text-base text-gray-600">No orders yet</p>
          <Link
          href="/collections/all"
          className="inline-flex items-center justify-center rounded-full bg-sage px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white hover:bg-sage-dark">
          
            Start Shopping
          </Link>
        </div> :

      <div className="flex flex-col gap-3">
          {orders.map((order) => <OrderCard key={order.id} order={order} />)}
        </div>
      }
    </div>);

}