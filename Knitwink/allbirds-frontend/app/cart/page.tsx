import type { Metadata } from 'next'
import { getBestsellers } from '@/lib/api/products'
import { CartPageClient } from './CartPageClient'

export const metadata: Metadata = {
  title: 'Your Cart',
  description: 'Review your cart and proceed to checkout.',
}

export default async function CartPage() {
  // Fetch upsell suggestions — bestsellers make a good default
  const upsellProducts = await getBestsellers().catch(() => [])

  return <CartPageClient upsellProducts={upsellProducts.slice(0, 3)} />
}
