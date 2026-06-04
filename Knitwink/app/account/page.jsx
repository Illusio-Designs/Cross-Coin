import AccountClient from './AccountClient'
import { SITE_NAME } from '@/lib/constants'

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com'

export const metadata = {
  title: `My Account — ${SITE_NAME}`,
  description: `Manage your ${SITE_NAME} account — orders, addresses, profile.`,
  alternates: { canonical: `${SITE_URL}/account` },
  // Authenticated-only area; don't index.
  robots: { index: false, follow: false },
}

export default function AccountPage() {
  return <AccountClient />
}
