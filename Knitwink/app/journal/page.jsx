import JournalClient from './JournalClient'
import { SITE_NAME } from '@/lib/constants'

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com'

export const metadata = {
  title: `Journal — ${SITE_NAME}`,
  description: `Stories, guides, and material deep-dives from the ${SITE_NAME} team.`,
  alternates: { canonical: `${SITE_URL}/journal` },
  openGraph: {
    title: `${SITE_NAME} Journal`,
    description: 'Stories, guides, and material deep-dives.',
    url: `${SITE_URL}/journal`,
    type: 'website',
  },
}

export default function JournalPage() {
  return <JournalClient />
}
