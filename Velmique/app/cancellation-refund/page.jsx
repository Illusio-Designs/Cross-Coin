import PolicyView from '@/components/policy/PolicyView';
import SeoWrapper from '@/components/SeoWrapper';

export const metadata = { title: 'Cancellation & Refund — Velmique' };

export default function CancellationRefundPage() {
  return (
    <SeoWrapper pageName="cancellation-and-refund">
      <PolicyView
        name="cancellation"
        eyebrow="Policies"
        fallbackTitle="Cancellation"
        fallbackAccent="& REFUND"
        intro="How to cancel an order and how refunds are processed back to your UPI, card or bank."
      />
    </SeoWrapper>
  );
}
