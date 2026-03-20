import { Leaf } from 'lucide-react'
import Link from 'next/link'

export function SustainabilityStrip() {
  return (
    <section className="bg-sage-light py-16 md:py-20">
      <div className="mx-auto max-w-site px-6 text-center md:px-10 lg:px-16">
        <Leaf className="mx-auto mb-4 text-sage-dark" size={32} aria-hidden="true" />
        <h2 className="font-display text-3xl font-normal text-brand-black lg:text-4xl">
          Made with natural materials
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-800">
          From merino wool to eucalyptus tree fiber, every material is chosen for comfort,
          performance, and a lower carbon footprint.
        </p>
        <Link
          href="/sustainability"
          className="mt-8 inline-block text-sm text-brand-black underline underline-offset-4 transition-colors duration-150 hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage"
        >
          Our sustainability story
        </Link>
      </div>
    </section>
  )
}
