import { ContactPageClient } from './ContactPageClient'
import SeoWrapper from '@/components/SeoWrapper'

export default function ContactPage() {
  return (
    <SeoWrapper pageName="contact">
      <ContactPageClient />
    </SeoWrapper>
  )
}
