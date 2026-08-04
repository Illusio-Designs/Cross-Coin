'use client'

const FEATURES = [
  { title: 'Anti-Microbial', desc: 'StayFresh technology keeps your feet odor-free and hygienic all day.', side: 'left' },
  { title: 'Breathable Knit', desc: 'Airy mesh construction for natural ventilation and all-season comfort.', side: 'right' },
  { title: 'Elastane Grip', desc: 'No-sag welt that stays in place without squeezing your ankle.', side: 'left' },
  { title: 'Soft Cotton Blend', desc: 'Premium combed cotton that feels gentle against your skin.', side: 'right' },
]

export function FeatureHighlight({ imageUrl, productName }) {
  if (!imageUrl) return null

  return (
    <section className="bg-off-white">
      <div className="px-4 py-12 sm:px-6 sm:py-14 md:py-20">
        <div className="mx-auto flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-0" style={{ maxWidth: 1050 }}>

          {/* Left features — on mobile render above center */}
          <div className="flex w-full flex-col gap-6 sm:gap-8 lg:flex-1 lg:gap-25 lg:items-end lg:text-right lg:pr-16 lg:w-auto">
            {FEATURES.filter(f => f.side === 'left').map(f => (
              <div key={f.title} className="w-full lg:max-w-[250px]">
                <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-brand-black sm:text-[14px] lg:text-[15px]">{f.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 text-justify sm:text-[14px]">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Center — double circle + round image */}
          <div className="relative shrink-0 flex items-center justify-center w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] lg:w-[400px] lg:h-[400px]">
            <div className="absolute inset-0 rounded-full border border-gray-400" />
            <div className="absolute inset-3.5 rounded-full border border-gray-300" />
            <img
              src={imageUrl}
              alt={productName}
              className="relative rounded-full object-cover w-[220px] h-[220px] sm:w-[270px] sm:h-[270px] lg:w-[340px] lg:h-[340px]"
            />
            {/* 4 dots — only on desktop where positions line up */}
            <span className="hidden lg:block absolute h-3 w-3 rounded-full bg-gray-400" style={{ top: 80, left: '7%' }} />
            <span className="hidden lg:block absolute h-3 w-3 rounded-full bg-gray-400" style={{ bottom: 132, left: '96%' }} />
            <span className="hidden lg:block absolute h-3 w-3 rounded-full bg-gray-400" style={{ left: 3, top: '63%' }} />
            <span className="hidden lg:block absolute h-3 w-3 rounded-full bg-gray-400" style={{ right: 29, top: '20%' }} />
          </div>

          {/* Right features */}
          <div className="flex w-full flex-col gap-6 sm:gap-8 lg:flex-1 lg:gap-25 lg:items-start lg:text-left lg:pl-16 lg:w-auto">
            {FEATURES.filter(f => f.side === 'right').map(f => (
              <div key={f.title} className="w-full lg:max-w-[250px]">
                <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-brand-black sm:text-[14px] lg:text-[15px]">{f.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 text-justify sm:text-[14px]">{f.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
