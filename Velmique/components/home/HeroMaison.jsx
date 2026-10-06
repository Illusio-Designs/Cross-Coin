import Link from 'next/link';

/* Maison hero — the pasted design's "Wear your presence." layout: a warm
   stone stage with the headline and CTAs on the left and a product flacon
   bleeding off the right edge, plus the circular "crafted by hand" stamp.

   Static by design (fast LCP, no client JS). The flacon image defaults to
   /perfumehero.webp and can be overridden via the `image` prop. The site
   header is a sticky opaque bar in normal flow, so the hero simply fills the
   viewport below it — no fixed-header top padding needed. */
export default function HeroMaison({ image = '/perfumehero.webp' }) {
  return (
    <section
      className="relative overflow-hidden flex items-start md:items-center min-h-[850px] md:min-h-[88vh]"
      style={{ background: '#dedbd5' }}
    >
      {/* Product flacon — bleeds off the right edge */}
      <img
        src={image}
        alt="Velmique signature fragrance"
        className="absolute z-[2] object-contain object-bottom
                   right-[-10%] bottom-[-20px] w-full h-[55%]
                   md:right-[3%] md:bottom-0 md:w-[min(51vw,720px)] md:h-[92%]"
        style={{ filter: 'drop-shadow(0 30px 30px rgba(0,0,0,0.12))' }}
      />

      {/* Content */}
      <div className="relative z-[4] w-full max-w-[1440px] mx-auto px-6 md:px-[7vw] pt-32 md:pt-0 pb-20 md:pb-0">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--gold-deep)] mb-6 font-body">
          Maison de Parfum · Est. 2018
        </p>

        <h1 className="font-serif text-[var(--ink)] max-w-[750px]"
          style={{ fontWeight: 500, fontSize: 'clamp(3.4rem, 9vw, 7.8rem)', lineHeight: 0.85, letterSpacing: '-0.03em' }}>
          Wear your <em className="italic font-normal">presence.</em>
        </h1>

        <p className="mt-9 max-w-[430px] text-[14px] leading-[1.9] font-body text-[#514d47]">
          Hand-blended fragrances built around rare absolutes, aged oud, Kannauj rose and
          Mysore sandalwood. Crafted for those who leave a memory behind.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3.5 w-[200px] sm:w-auto">
          <Link
            href="/shop"
            className="text-center px-7 py-4 text-[10px] tracking-[0.2em] uppercase font-body border border-[var(--ink)] bg-[var(--ink)] text-white transition-colors hover:bg-[var(--gold-deep)] hover:border-[var(--gold-deep)]"
          >
            Discover the collection
          </Link>
          <Link
            href="/about"
            className="text-center px-7 py-4 text-[10px] tracking-[0.2em] uppercase font-body border border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-white"
          >
            Our story
          </Link>
        </div>
      </div>

      {/* Circular stamp — desktop only */}
      <div className="hidden md:flex absolute right-[8%] top-[26%] z-[4] w-[125px] h-[125px] rounded-full border border-black/30 items-center justify-center text-center">
        <span aria-hidden className="absolute top-3.5 text-[12px]">✦</span>
        <span className="font-serif text-[16px] leading-[1.2]">
          Crafted<br />by hand<br />in India
        </span>
      </div>
    </section>
  );
}
