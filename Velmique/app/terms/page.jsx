import { seoMeta } from '@/lib/site';
import PolicyPage from '../_components/PolicyPage';

export const revalidate = 600;

export async function generateMetadata() {
  return seoMeta('terms-and-conditions', { title: 'Terms of Use — Velmique', description: 'The terms that govern your use of the Velmique website and services.', path: '/terms' });
}

export default function TermsPage() {
  return <PolicyPage name="terms" fallbackTitle="Terms of Use" intro="The terms that govern your use of the Velmique website and services." />;
}
