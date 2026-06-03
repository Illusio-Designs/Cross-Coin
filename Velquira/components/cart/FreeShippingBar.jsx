import { SHIPPING_THRESHOLD } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';





export function FreeShippingBar({ subtotal }) {
  const progress = Math.min(subtotal / SHIPPING_THRESHOLD * 100, 100);
  const remaining = SHIPPING_THRESHOLD - subtotal;
  const achieved = subtotal >= SHIPPING_THRESHOLD;

  return (
    <div className="border-b border-gray-200 px-6 py-3">
      <p className="mb-2 text-center text-xs text-gray-600">
        {achieved ?
        'You qualify for free shipping!' :
        `${formatPrice(remaining)} away from free shipping`}
      </p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-sage transition-all duration-300"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Free shipping progress" />
        
      </div>
    </div>);

}