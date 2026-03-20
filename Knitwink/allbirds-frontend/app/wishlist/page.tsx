import type { Metadata } from 'next'
import { WishlistPageClient } from './WishlistPageClient'

export const metadata: Metadata = {
  title: 'Wishlist',
  description: 'Your saved favourites.',
}

export default function WishlistPage() {
  return <WishlistPageClient />
}
