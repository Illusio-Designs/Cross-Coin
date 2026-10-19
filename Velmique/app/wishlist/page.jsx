import { pageMeta } from '@/lib/site';
import WishlistClient from './WishlistClient';

export const metadata = pageMeta({ title: 'Your Wishlist — Velmique', description: 'The Velmique fragrances you saved for later.', path: '/wishlist', noindex: true });

export default function WishlistPage() {
  return <WishlistClient />;
}
