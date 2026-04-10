
import Image from 'next/image';
import { Leaf, Recycle, Wind, Droplets } from 'lucide-react';
import { SITE_NAME } from '@/lib/constants';

export const metadata = {
  title: 'Sustainability',
  description: "We're in the business of better. Here's how we're reducing our footprint.",
  openGraph: {
    title: `Sustainability | ${SITE_NAME}`,
    description: "We're in the business of better.",
    images: [{ url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80' }]
  }
};

const MATERIALS = [
{
  name: 'Merino Wool',
  description: 'Naturally temperature-regulating, moisture-wicking, and odor-resistant. Our ZQ-certified merino wool is sourced from farms with the highest animal welfare standards.',
  icon: Leaf,
  image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  carbon: '2.4kg CO₂e'
},
{
  name: 'Tree Fiber',
  description: 'Soft TENCEL™ lyocell made from sustainably harvested eucalyptus trees. Breathable, lightweight, and produced in a closed-loop process that recycles water and solvents.',
  icon: Wind,
  image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
  carbon: '1.8kg CO₂e'
},
{
  name: 'SweetFoam®',
  description: "The world's first carbon-negative EVA foam, made from sugarcane grown in Brazil. It replaces petroleum-based foam and actually removes carbon from the atmosphere.",
  icon: Droplets,
  image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
  carbon: '−0.6kg CO₂e'
},
{
  name: 'Recycled Materials',
  description: 'Our laces are made from recycled plastic bottles. Our insoles use castor bean oil. We are constantly finding ways to replace virgin materials with recycled alternatives.',
  icon: Recycle,
  image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&q=80',
  carbon: '0.9kg CO₂e'
}];


const STATS = [
{ value: '2016', label: 'Founded' },
{ value: '9.9kg', label: 'Avg CO₂e per shoe' },
{ value: '100%', label: 'Carbon offset' },
{ value: '50+', label: 'Countries shipped' }];


export default function SustainabilityPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl relative flex min-h-[60vh] items-center justify-center bg-sage-light">
        <Image
          src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80"
          alt="Natural landscape"
          fill
          className="object-cover object-center opacity-40"
          priority />
        
        <div className="relative z-10 px-6 text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-gray-600">Our commitment</p>
          <h1 className="font-display text-6xl font-normal tracking-tight text-brand-black lg:text-7xl">
            We&apos;re in the business<br />of better
          </h1>
        </div>
      </section>

      {/* Carbon stat band */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-sage-light py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-600">Average carbon footprint per pair</p>
        <p className="mt-2 font-display text-7xl font-normal text-brand-black lg:text-8xl">9.9kg</p>
        <p className="mt-2 text-sm text-gray-600">CO₂e — vs. industry average of 12.5kg</p>
      </section>

      {/* Materials */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-6 py-24 md:px-10 lg:px-16">
        <div className="mx-auto max-w-site">
          <h2 className="mb-16 text-center font-display text-4xl font-normal text-brand-black">
            Natural materials, better choices
          </h2>
          <div className="grid grid-cols-1 gap-16">
            {MATERIALS.map((mat, i) => {
              const Icon = mat.icon;
              const isEven = i % 2 === 0;
              return (
                <div
                  key={mat.name}
                  className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 ${isEven ? '' : 'lg:[&>*:first-child]:order-2'}`}>
                  
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                    <Image src={mat.image} alt={mat.name} fill className="object-cover" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-light">
                      <Icon size={20} className="text-sage" />
                    </div>
                    <h3 className="font-display text-3xl font-normal text-brand-black">{mat.name}</h3>
                    <p className="text-base leading-relaxed text-gray-600">{mat.description}</p>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-gray-800">
                      <Leaf size={12} className="text-sage" />
                      {mat.carbon}
                    </span>
                  </div>
                </div>);

            })}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-off-white py-20">
        <div className="mx-auto grid max-w-site grid-cols-2 gap-8 px-6 md:grid-cols-4 md:px-10 lg:px-16">
          {STATS.map((s) =>
          <div key={s.label} className="text-center">
              <p className="font-display text-5xl font-normal text-brand-black">{s.value}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-widest text-gray-600">{s.label}</p>
            </div>
          )}
        </div>
      </section>

      {/* Certifications */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-6 py-24 text-center md:px-10 lg:px-16">
        <div className="mx-auto max-w-site">
          <h2 className="mb-4 font-display text-4xl font-normal text-brand-black">Certified better</h2>
          <p className="mx-auto mb-12 max-w-lg text-base leading-relaxed text-gray-600">
            Our commitments are verified by independent third parties so you can trust every claim we make.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {['B Corp Certified', 'Carbon Neutral', 'ZQ Merino', 'Bluesign®', 'TENCEL™'].map((cert) =>
            <div key={cert} className="rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-gray-800">
                {cert}
              </div>
            )}
          </div>
        </div>
      </section>
    </>);

}