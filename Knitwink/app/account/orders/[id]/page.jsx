
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getOrder } from '@/lib/api/orders';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';


export const metadata = { title: 'Order Detail' };

const TIMELINE = [
{ status: 'confirmed', label: 'Confirmed' },
{ status: 'processing', label: 'Processing' },
{ status: 'shipped', label: 'Shipped' },
{ status: 'delivered', label: 'Delivered' }];


const STATUS_ORDER = ['confirmed', 'processing', 'shipped', 'delivered'];

export default async function OrderDetailPage({ params }) {
  let order;
  try {
    order = await getOrder(params.id);
  } catch {
    notFound();
  }

  const currentStep = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <Link
          href={ROUTES.orders}
          className="mb-4 inline-block text-sm text-gray-600 underline underline-offset-4 hover:text-brand-black transition-colors duration-150">
          
          ← Back to Orders
        </Link>
        <h1 className="font-display text-3xl font-normal text-brand-black">
          Order #{order.orderNumber}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Placed {format(new Date(order.createdAt), 'd MMM yyyy')}
        </p>
      </div>

      {/* Status timeline — hidden for cancelled orders */}
      {order.status !== 'cancelled' &&
      <div className="rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-2">
            {TIMELINE.map((step, i) => {
            const done = currentStep >= i;
            const active = currentStep === i;
            return (
              <div key={step.status} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-center">
                    <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                      done ? 'bg-sage text-white' : 'bg-gray-200 text-gray-400'
                    )}
                    aria-current={active ? 'step' : undefined}>
                    
                      {i + 1}
                    </div>
                    {i < TIMELINE.length - 1 &&
                  <div
                    className={cn(
                      'h-0.5 flex-1',
                      currentStep > i ? 'bg-sage' : 'bg-gray-200'
                    )} />

                  }
                  </div>
                  <p
                  className={cn(
                    'text-xs',
                    done ? 'font-medium text-brand-black' : 'text-gray-400'
                  )}>
                  
                    {step.label}
                  </p>
                </div>);

          })}
          </div>
        </div>
      }

      {/* Items */}
      <div className="rounded-2xl border border-gray-200 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-3">
          Items
        </h2>
        <ul className="flex flex-col gap-4">
          {order.items.map((item) =>
          <li key={item.id} className="flex gap-4">
              <Link
              href={ROUTES.product(item.handle)}
              className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2">
              
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
              </Link>
              <div className="flex flex-1 items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-600">
                    {item.color} · Size {item.size} · Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium text-brand-black">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            </li>
          )}
        </ul>
      </div>

      {/* Bottom grid: shipping + totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Shipping address */}
        <div className="rounded-2xl border border-gray-200 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-3">
            Shipping Address
          </h2>
          <address className="not-italic text-sm text-gray-800 leading-relaxed">
            {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
            {order.shippingAddress.line1}<br />
            {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
            {order.shippingAddress.country}
          </address>
        </div>

        {/* Order totals */}
        <div className="rounded-2xl border border-gray-200 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-3">
            Summary
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm text-gray-800">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-800">
              <span>Shipping</span>
              <span>{order.shippingCost === 0 ? 'Free' : formatPrice(order.shippingCost)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-sm font-medium text-brand-black">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>);

}