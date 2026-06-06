import TrackOrderClient from './TrackOrderClient'
import { SITE_NAME } from '@/lib/constants'

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com'

export const metadata = {
  title: `Track your order — ${SITE_NAME}`,
  description: `Enter your order number or AWB to see the live shipping status of your ${SITE_NAME} order.`,
  alternates: { canonical: `${SITE_URL}/track-order` },
  openGraph: {
    title: `Track your order — ${SITE_NAME}`,
    description: 'Live shipping status for every order.',
    url: `${SITE_URL}/track-order`,
    type: 'website',
  },
}

export default function TrackOrderPage() {
  return <TrackOrderClient />
}
