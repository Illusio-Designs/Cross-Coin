import PolicyView from '@/components/policy/PolicyView';
import SeoWrapper from '@/components/SeoWrapper';

export const metadata = { title: 'Privacy Policy — Velmique' };

export default function PrivacyPolicyPage() {
  return (
    <SeoWrapper pageName="privacy-policy">
      <PolicyView
        name="privacy-policy"
        eyebrow="Legal"
        fallbackTitle="Privacy"
        fallbackAccent="POLICY"
        intro="How we collect, use and protect your personal information when you shop with Velmique."
      />
    </SeoWrapper>
  );
}
