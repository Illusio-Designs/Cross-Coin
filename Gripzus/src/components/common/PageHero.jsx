/* PageHero — interior page header in the GROUND INDEX language: a top meta
   rule (Gripzus · section), an oversized tight Space Grotesk title, a short
   intro, closed by a full-width hairline that leads into the content. Matches
   the home hero's architecture so every page reads as one system. */
export default function PageHero({ eyebrow, title, accent, intro, children }) {
  return (
    <section className="page-hero border-b border-line">
      {/* top meta rule */}
      <div className="wrap flex items-center justify-between gap-4 py-3 border-b border-line text-[10px] tracking-[0.2em] uppercase text-ink-muted">
        <span className="text-ink">Gripzus</span>
        {eyebrow && <span>{eyebrow}</span>}
      </div>

      <div className="wrap pt-10 md:pt-16 pb-9 md:pb-14">
        <h1 className="h-mark leading-[0.92] text-[2.5rem] sm:text-5xl md:text-6xl lg:text-[4.6rem] max-w-4xl text-ink">
          {title}
          {accent && <> <span className="text-ink-muted">{accent}</span></>}
        </h1>
        {intro && (
          <p className="prose-body text-[15px] md:text-lg mt-5 md:mt-6 max-w-xl">{intro}</p>
        )}
        {children}
      </div>
    </section>
  );
}
