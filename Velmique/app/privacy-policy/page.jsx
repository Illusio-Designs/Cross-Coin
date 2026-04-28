import PolicyView from '@/components/policy/PolicyView';

export const metadata = { title: 'Privacy Policy — Velmique' };

export default function PrivacyPolicyPage() {
  return (
    <PolicyView
      name="privacy-policy"
      eyebrow="Legal"
      fallbackTitle="Privacy"
      fallbackAccent="POLICY"
      intro="How we collect, use and protect your personal information when you shop with Velmique."
    />
  );
}
