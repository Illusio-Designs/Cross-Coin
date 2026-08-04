import RegisterClient from './RegisterClient'
import { SITE_NAME } from '@/lib/constants'

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com'

export const metadata = {
  title: `Create your account — ${SITE_NAME}`,
  description: `Create a ${SITE_NAME} account to save addresses, track orders, and earn loyalty points.`,
  alternates: { canonical: `${SITE_URL}/register` },
  robots: { index: false, follow: true },
}

export default function RegisterPage() {
  return <RegisterClient />
}
