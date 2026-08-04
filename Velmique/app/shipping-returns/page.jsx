import PolicyView from '@/components/policy/PolicyView';
import SeoWrapper from '@/components/SeoWrapper';

export const metadata = { title: 'Shipping Policy — Velmique' };

export default function ShippingPolicyPage() {
  return (
    <SeoWrapper pageName="shipping-policy">
      <PolicyView
        name="shipping-policy"
        eyebrow="Policies"
        fallbackTitle="Shipping"
        fallbackAccent="POLICY"
        intro="How we dispatch, deliver and track every Velmique order."
      />
    </SeoWrapper>
  );
}
