import { seoMeta } from '@/lib/site';
import PolicyPage from '../_components/PolicyPage';

export const revalidate = 600;

export async function generateMetadata() {
  return seoMeta('cancellation-and-refund', { title: 'Cancellation & Refund — Velmique', description: 'How to cancel a Velmique order and how refunds are processed.', path: '/cancellation-refund' });
}

export default function CancellationRefundPage() {
  return <PolicyPage name="cancellation" eyebrow="Customer care" fallbackTitle="Cancellation & Refund" intro="How to cancel an order and how refunds are processed back to your UPI, card or bank." />;
}
