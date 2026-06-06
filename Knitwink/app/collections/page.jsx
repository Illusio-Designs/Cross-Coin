import CollectionsClient from './CollectionsClient'
import { SITE_NAME } from '@/lib/constants'

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com'

export const metadata = {
  title: `Collections — ${SITE_NAME}`,
  description: `Browse every ${SITE_NAME} collection — knitwear made from natural fibres, designed to last.`,
  alternates: { canonical: `${SITE_URL}/collections` },
  openGraph: {
    title: `${SITE_NAME} Collections`,
    description: 'Browse every collection — knitwear made from natural fibres.',
    url: `${SITE_URL}/collections`,
    type: 'website',
  },
}

export default function CollectionsListPage() {
  return <CollectionsClient />
}
