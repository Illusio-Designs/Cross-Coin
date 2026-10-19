import { seoMeta } from '@/lib/site';
import PolicyPage from '../_components/PolicyPage';

export const revalidate = 600;

export async function generateMetadata() {
  return seoMeta('shipping-policy', { title: 'Shipping Policy — Velmique', description: 'How Velmique dispatches, delivers and tracks every order.', path: '/shipping-returns' });
}

export default function ShippingPolicyPage() {
  return <PolicyPage name="shipping-policy" eyebrow="Customer care" fallbackTitle="Shipping Policy" intro="How we dispatch, deliver and track every Velmique order." />;
}
