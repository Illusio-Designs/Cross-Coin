import AboutClient from './AboutClient'
import { SITE_NAME } from '@/lib/constants'

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com'

export const metadata = {
  title: `About — ${SITE_NAME}`,
  description: `${SITE_NAME} is built on natural fibres, thoughtful design, and a better footprint. Meet the people behind every piece.`,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: `About ${SITE_NAME}`,
    description: 'Natural fibres. Thoughtful design. A better footprint.',
    url: `${SITE_URL}/about`,
    type: 'website',
  },
}

export default function AboutPage() {
  return <AboutClient />
}
