import type { Metadata } from 'next'
import Image from 'next/image'
import { SITE_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'The story behind Allbirds — natural materials, thoughtful design, a better footprint.',
  openGraph: {
    title: `About Us | ${SITE_NAME}`,
    description: 'The story behind Allbirds.',
    images: [{ url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80' }],
  },
}

const STATS = [
  { value: '2016', label: 'Founded' },
  { value: '1M+', label: 'Pairs Sold' },
  { value: '95%', label: 'Natural Materials' },
  { value: '50+', label: 'Countries' },
]

const TEAM = [
  { name: 'Tim Brown', title: 'Co-CEO & Co-Founder', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80' },
  { name: 'Joey Zwillinger', title: 'Co-CEO & Co-Founder', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80' },
  { name: 'Erin Lowenberg', title: 'Chief Marketing Officer', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80' },
  { name: 'Hian Oliveira', title: 'Chief Product Officer', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80' },
]

const VALUES = [
  {
    icon: '🌿',
    title: 'Natural First',
    description: 'We start with nature. Every material is chosen because it performs better and treads lighter than synthetic alternatives.',
  },
  {
    icon: '🔬',
    title: 'Radical Transparency',
    description: 'We publish the carbon footprint of every product. No greenwashing — just honest numbers and a commitment to improve them.',
  },
  {
    icon: '♻️',
    title: 'Circular by Design',
    description: 'Our ReRun program gives worn Allbirds a second life. Because the most sustainable shoe is one that never ends up in a landfill.',
  },
]

const STORY_SECTIONS = [
  {
    heading: 'It started with a sheep',
    body: 'In 2014, Tim Brown — a New Zealand native and professional footballer — had a simple idea: make a better shoe using merino wool. After years of development and a record-breaking Kickstarter campaign, Allbirds launched in 2016 with one shoe and one mission.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
    imageAlt: 'Merino wool fibers close-up',
    imageLeft: false,
  },
  {
    heading: 'Then came the trees',
    body: 'We didn\'t stop at wool. We developed Tree, a silky-soft material made from TENCEL™ lyocell sourced from sustainably harvested eucalyptus trees. Then SweetFoam® — the world\'s first carbon-negative EVA foam, made from sugarcane.',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80',
    imageAlt: 'Eucalyptus forest',
    imageLeft: true,
  },
]

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl relative flex min-h-[70vh] items-center justify-center bg-off-white">
        <Image
          src="https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=1600&q=80"
          alt="Allbirds shoes on natural terrain"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-brand-black/30" />
        <div className="relative z-10 px-6 text-center">
          <h1 className="font-display text-6xl font-normal tracking-tight text-white lg:text-8xl">
            Our Story
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-white/90">
            We believe in better. Better materials, better design, a better footprint on this planet.
          </p>
        </div>
      </section>

      {/* Story sections */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-6 py-16 md:px-10 md:py-24 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-site flex flex-col gap-24">
          {STORY_SECTIONS.map((section) => (
            <div key={section.heading} className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 ${section.imageLeft ? 'lg:order-1' : 'lg:order-2'}`}>
                <Image src={section.image} alt={section.imageAlt} fill className="object-cover" />
              </div>
              <div className={section.imageLeft ? 'lg:order-2' : 'lg:order-1'}>
                <h2 className="font-display text-3xl font-normal text-brand-black lg:text-4xl">
                  {section.heading}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-gray-600">{section.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats band */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-off-white py-16 md:py-24">
        <div className="mx-auto max-w-site px-6 md:px-10 lg:px-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-4xl font-normal text-brand-black lg:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs font-medium uppercase tracking-widest text-gray-600">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-6 py-16 md:px-10 md:py-24 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-site">
          <h2 className="mb-12 text-center font-display text-3xl font-normal text-brand-black lg:text-4xl">
            The people behind the shoes
          </h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {TEAM.map((person) => (
              <div key={person.name} className="flex flex-col gap-3">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                  <Image src={person.image} alt={person.name} fill className="object-cover" />
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-black">{person.name}</p>
                  <p className="text-xs text-gray-600">{person.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-off-white py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-site px-6 md:px-10 lg:px-16">
          <h2 className="mb-12 text-center font-display text-3xl font-normal text-brand-black lg:text-4xl">
            What we stand for
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {VALUES.map((value) => (
              <div key={value.title} className="flex flex-col gap-4 rounded-2xl bg-white p-8">
                <span className="text-3xl" aria-hidden="true">{value.icon}</span>
                <p className="text-sm font-medium text-brand-black">{value.title}</p>
                <p className="text-sm leading-relaxed text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
