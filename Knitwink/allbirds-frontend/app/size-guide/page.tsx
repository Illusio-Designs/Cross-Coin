import type { Metadata } from 'next'
import { SizeGuideClient } from './SizeGuideClient'

export const metadata: Metadata = {
  title: 'Size Guide',
  description: 'Find your perfect fit with our size guide for men, women, and kids.',
}

export default function SizeGuidePage() {
  return <SizeGuideClient />
}
