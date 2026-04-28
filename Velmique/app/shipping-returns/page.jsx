import PolicyView from '@/components/policy/PolicyView';

export const metadata = { title: 'Shipping Policy — Velmique' };

export default function ShippingPolicyPage() {
  return (
    <PolicyView
      name="shipping-policy"
      eyebrow="Policies"
      fallbackTitle="Shipping"
      fallbackAccent="POLICY"
      intro="How we dispatch, deliver and track every Velmique order."
    />
  );
}
