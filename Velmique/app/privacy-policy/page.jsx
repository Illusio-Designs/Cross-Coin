import { seoMeta } from '@/lib/site';
import PolicyPage from '../_components/PolicyPage';

export const revalidate = 600;

export async function generateMetadata() {
  return seoMeta('privacy-policy', { title: 'Privacy Policy — Velmique', description: 'How Velmique collects, uses and protects your personal information.', path: '/privacy-policy' });
}

export default function PrivacyPolicyPage() {
  return <PolicyPage name="privacy-policy" fallbackTitle="Privacy Policy" intro="How we collect, use and protect your personal information when you shop with Velmique." />;
}
