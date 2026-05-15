/* PageHero — refined chapter heading for sub-pages.
   Centered eyebrow + serif display title + intro on warm paper. */
export default function PageHero({ eyebrow, title, accent, intro }) {
  return (
    <section className="bg-paper-warm border-b border-line">
      <div className="max-w-site mx-auto px-6 lg:px-10 py-16 md:py-24 text-center">
        {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
        <h1 className="h-display text-4xl md:text-6xl">
          {title}{' '}
          {accent && <span className="h-italic">{accent}</span>}
        </h1>
        {intro && (
          <p className="prose-body text-base md:text-lg max-w-2xl mx-auto mt-6">{intro}</p>
        )}
      </div>
    </section>
  );
}
