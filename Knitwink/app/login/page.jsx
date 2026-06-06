import LoginClient from './LoginClient'
import { SITE_NAME } from '@/lib/constants'

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com'

export const metadata = {
  title: `Sign in — ${SITE_NAME}`,
  description: `Sign in to your ${SITE_NAME} account to view orders, manage addresses, and pick up where you left off.`,
  alternates: { canonical: `${SITE_URL}/login` },
  // Auth pages shouldn't be indexed.
  robots: { index: false, follow: true },
}

export default function LoginPage() {
  return <LoginClient />
}
