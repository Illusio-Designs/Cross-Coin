import PolicyView from '@/components/policy/PolicyView';
import SeoWrapper from '@/components/SeoWrapper';

export const metadata = { title: 'Terms of Use — Velmique' };

export default function TermsPage() {
  return (
    <SeoWrapper pageName="terms-and-conditions">
      <PolicyView
        name="terms"
        eyebrow="Legal"
        fallbackTitle="Terms"
        fallbackAccent="OF USE"
        intro="The terms that govern your use of the Velmique website and services."
      />
    </SeoWrapper>
  );
}
