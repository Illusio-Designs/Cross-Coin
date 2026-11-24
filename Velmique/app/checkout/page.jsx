import { pageMeta } from '@/lib/site';
import BagView from '../_components/BagView';

export const metadata = pageMeta({ title: 'Checkout — Velmique', description: 'Delivery and payment for your Velmique order.', path: '/checkout', noindex: true });

export default function CheckoutPage() {
  return <BagView checkoutPage />;
}
