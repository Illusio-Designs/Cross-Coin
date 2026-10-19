import { pageMeta } from '@/lib/site';
import BagView from '../_components/BagView';

export const metadata = pageMeta({ title: 'Your Bag — Velmique', description: 'Review the fragrances in your bag.', path: '/cart', noindex: true });

export default function CartPage() {
  return <BagView />;
}
