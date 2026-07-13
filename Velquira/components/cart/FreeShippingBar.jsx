import { SHIPPING_THRESHOLD } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';

export function FreeShippingBar({ subtotal }) {
  const progress = Math.min(subtotal / SHIPPING_THRESHOLD * 100, 100);
  const remaining = SHIPPING_THRESHOLD - subtotal;
  const achieved = subtotal >= SHIPPING_THRESHOLD;

  return (
    <div className="border-b border-line px-6 py-4">
      <p className="mb-2.5 text-xs tracking-wide text-text-muted">
        {achieved ?
        <>You&rsquo;ve unlocked <span className="font-semibold text-ink">free shipping</span> ✓</> :

        <>You&rsquo;re <span className="font-semibold text-ink">{formatPrice(remaining)}</span> away from free shipping</>
        }
      </p>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-light to-gold transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Free shipping progress" />

      </div>
    </div>);

}
