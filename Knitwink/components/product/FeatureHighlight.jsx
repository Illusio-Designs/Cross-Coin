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
      <div className="px-6 py-14 md:py-20">
        <div className="mx-auto flex flex-col items-center gap-10 lg:flex-row lg:justify-center lg:gap-0" style={{ maxWidth: 1050 }}>

          {/* Left features */}
          <div className="flex flex-1 flex-col gap-25 lg:items-end lg:text-right lg:pr-16">
            {FEATURES.filter(f => f.side === 'left').map(f => (
              <div key={f.title} className="max-w-[250px]">
                <p className="text-[15px] font-bold uppercase tracking-[0.2em] text-brand-black">{f.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Center — double circle + round image */}
          <div className="relative shrink-0 flex items-center justify-center" style={{ width: 400, height: 400 }}>
            {/* Outer circle */}
            <div className="absolute inset-0 rounded-full border border-gray-400" />
            {/* Inner circle */}
            <div className="absolute inset-3.5 rounded-full border border-gray-300" />
            {/* Product image — circular, centered */}
            <img
              src={imageUrl}
              alt={productName}
              className="relative h-[340px] w-[340px] rounded-full object-cover"
            />
            {/* 4 dots exactly on the outer circle border */}
            <span className="absolute h-3 w-3 rounded-full bg-gray-400" style={{ top: 80, left: '7%' }} />
            <span className="absolute h-3 w-3 rounded-full bg-gray-400" style={{ bottom: 132, left: '96%' }} />
            <span className="absolute h-3 w-3 rounded-full bg-gray-400" style={{ left: 3, top: '63%' }} />
            <span className="absolute h-3 w-3 rounded-full bg-gray-400" style={{ right: 29, top: '20%' }} />
          </div>

          {/* Right features */}
          <div className="flex flex-1 flex-col gap-25 lg:items-start lg:text-left lg:pl-16">
            {FEATURES.filter(f => f.side === 'right').map(f => (
              <div key={f.title} className="max-w-[250px]">
                <p className="text-[15px] font-bold uppercase tracking-[0.2em] text-brand-black">{f.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
