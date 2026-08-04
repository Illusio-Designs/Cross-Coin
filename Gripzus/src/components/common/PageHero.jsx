/* PageHero — premium editorial page header.
   A large, left-aligned display title with a quiet eyebrow and a short intro,
   flowing straight onto the page (no boxed banner) with generous whitespace —
   the same understated, high-end language the home page and the sibling brands
   (Morbix / Soxbae) use. Closed by a hairline that leads into the content. */
export default function PageHero({ eyebrow, title, accent, intro, children }) {
  return (
    <section className="page-hero wrap pt-9 md:pt-14 pb-0">
      {eyebrow && <p className="eyebrow text-ink-muted mb-3.5">{eyebrow}</p>}
      <h1 className="h-display leading-[1.03] text-[2.15rem] sm:text-4xl md:text-5xl lg:text-6xl max-w-4xl">
        {title}
        {accent && <> <span className="h-italic">{accent}</span></>}
      </h1>
      {intro && (
        <p className="prose-body text-[15px] md:text-lg mt-4 md:mt-5 max-w-xl">{intro}</p>
      )}
      {children}
      <div className="hairline mt-7 md:mt-9" />
    </section>
  );
}
