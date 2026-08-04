import { ContactPageClient } from './ContactPageClient'
import { SITE_NAME } from '@/lib/constants'

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com'

export const metadata = {
  title: `Contact — ${SITE_NAME}`,
  description: `Get in touch with ${SITE_NAME}. We answer every email within one business day.`,
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: `Contact — ${SITE_NAME}`,
    description: 'Reach out — we answer every email within one business day.',
    url: `${SITE_URL}/contact`,
    type: 'website',
  },
}

export default function ContactPage() {
  return <ContactPageClient />
}
