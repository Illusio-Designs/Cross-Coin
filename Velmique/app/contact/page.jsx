import ContactClient from './ContactClient';
import { buildMetadata } from '@/lib/api/seo';

// Server-rendered, dashboard-driven SEO for the contact page. The interactive
// form lives in ContactClient (a client component).
export async function generateMetadata() {
  return buildMetadata('contact', { title: 'Contact — Velmique' });
}

export default function ContactPage() {
  return <ContactClient />;
}
