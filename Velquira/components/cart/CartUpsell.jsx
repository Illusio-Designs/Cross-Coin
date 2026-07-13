'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';

export function CartUpsell({ products }) {
  const { addItem } = useCart();

  if (!products.length) return null;

  return (
    <div className="mt-8 border-t border-line pt-7">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">
        You May Also Like
      </p>
      <ul className="flex flex-col">
        {products.map((product) => {
          const image = product.images[0];
          const firstVariant = product.variants[0];
          const firstColor = product.colors[0];

          return (
            <li
              key={product.id}
              className="flex items-center gap-4 border-b border-line py-3.5 last:border-0">

              <Link
                href={`/products/${product.handle}`}
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-paper focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold">

                {image &&
                <Image src={image.url} alt={image.alt} fill className="object-contain" />
                }
              </Link>

              <div className="flex flex-1 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="vq-display truncate text-sm text-ink">{product.name}</p>
                  <p className="mt-0.5 text-[12.5px] font-medium text-gold">
                    {formatPrice(product.price)}
                  </p>
                </div>
                <button
                  onClick={() =>
                  firstVariant &&
                  firstColor &&
                  addItem({
                    id: firstVariant.id,
                    productId: product.id,
                    variantId: firstVariant.id,
                    name: product.name,
                    color: firstColor.name,
                    size: firstVariant.size,
                    price: product.price,
                    quantity: 1,
                    imageUrl: image?.url ?? '',
                    handle: product.handle
                  })
                  }
                  className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted transition-colors duration-300 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold">

                  Add
                </button>
              </div>
            </li>);

        })}
      </ul>
    </div>);

}
