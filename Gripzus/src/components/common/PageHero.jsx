/* PageHero — premium editorial page header.
   A large, left-aligned display title with a quiet eyebrow and a short intro,
   flowing straight onto the page (no boxed banner) with generous whitespace —
   the same understated, high-end language the home page and the sibling brands
   (Morbix / Soxbae) use. Closed by a hairline that leads into the content. */
export default function PageHero({ eyebrow, title, accent, intro, children }) {
  return (
    <section className="wrap pt-16 md:pt-24 pb-0">
      {eyebrow && <p className="eyebrow text-ink-muted mb-5">{eyebrow}</p>}
      <h1 className="h-display leading-[1.01] text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl">
        {title}
        {accent && <> <span className="h-italic">{accent}</span></>}
      </h1>
      {intro && (
        <p className="prose-body text-base md:text-lg mt-6 max-w-xl">{intro}</p>
      )}
      {children}
      <div className="hairline mt-10 md:mt-14" />
    </section>
  );
}
