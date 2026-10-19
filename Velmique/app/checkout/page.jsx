import { pageMeta } from '@/lib/site';
import BagView from '../_components/BagView';

export const metadata = pageMeta({ title: 'Checkout — Velmique', description: 'Delivery and payment for your Velmique order.', path: '/checkout', noindex: true });

// The secure checkout (address, offers, COD / prepaid) runs in the bag drawer;
// this route lists the bag and opens the drawer on its checkout step.
export default function CheckoutPage() {
  return <BagView autoCheckout />;
}
