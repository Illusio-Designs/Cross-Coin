import { Leaf } from 'lucide-react'
import Link from 'next/link'

export function SustainabilityStrip() {
  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-sage-light px-6 py-14 text-center md:py-20">
      <Leaf className="mx-auto mb-4 text-sage-dark" size={28} aria-hidden="true" />
      <h2 className="font-display text-3xl font-normal text-brand-black lg:text-4xl">
        Made with natural materials
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-gray-800">
        From merino wool to eucalyptus tree fiber, every material is chosen for comfort,
        performance, and a lower carbon footprint.
      </p>
      <Link
        href="/sustainability"
        className="mt-6 inline-block text-sm text-brand-black underline underline-offset-4 transition-colors duration-150 hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage"
      >
        Our sustainability story
      </Link>
    </section>
  )
}
