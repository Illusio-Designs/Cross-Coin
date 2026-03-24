import type { Metadata } from 'next'
import { ContactPageClient } from './ContactPageClient'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the Allbirds team.',
}

export default function ContactPage() {
  return <ContactPageClient />
}
