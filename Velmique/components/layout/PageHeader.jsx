/* Editorial page header — matches the homepage title system.
   Usage:
     <PageHeader eyebrow="Browse" title="ALL FRAGRANCES" accent="& EXTRAITS" intro="..." />
*/
export default function PageHeader({
  eyebrow,
  title,
  accent,
  intro,
  align = 'left',
  size = 'lg', // 'lg' | 'md'
}) {
  const sizeStyle = size === 'md'
    ? { fontSize: 'clamp(1.8rem, 4.5vw, 3.4rem)' }
    : { fontSize: 'clamp(2.2rem, 6vw, 5rem)' };

  const alignClass =
    align === 'center' ? 'text-center mx-auto' :
    align === 'right'  ? 'text-right ml-auto'   :
                          'text-left';

  return (
    <header className={`max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pt-14 md:pt-20 pb-10 md:pb-14 ${align === 'center' ? 'flex flex-col items-center' : ''}`}>
      {eyebrow && (
        <p className={`text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-4 ${alignClass}`}>
          {eyebrow}
        </p>
      )}
      <h1
        className={`font-display text-[var(--ink)] leading-[0.92] tracking-[-0.01em] ${alignClass} max-w-5xl`}
        style={sizeStyle}
      >
        {title}{' '}
        {accent && <em className="not-italic gold-text">{accent}</em>}
      </h1>
      {intro && (
        <p className={`text-[var(--ink-soft)] text-base md:text-lg leading-relaxed font-body mt-6 max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
          {intro}
        </p>
      )}
    </header>
  );
}
