import type { Metadata } from 'next'
import { RegisterPageClient } from './RegisterPageClient'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a new account to start shopping.',
}

export default function RegisterPage() {
  return <RegisterPageClient />
}
