// Lightweight icon helper for the ported Morbix sections. Gripzus has no icon
// library (no lucide-react / hugeicons), so this is self-contained: the only
// icons the ported Reviews/WriteReview components use are "Star" (a solid ★
// glyph, exactly as Morbix rendered it) and "X" (a plain inline close SVG).
// Any other name falls back to a small dot so it never throws.
export default function Icon({ name, size = 18, color, className, strokeWidth = 1.8 }) {
  // Rating stars render as a SOLID glyph (matches Morbix). Colour + className
  // pass through unchanged so rating colours are preserved.
  if (name === 'Star') {
    return (
      <span className={className} aria-hidden="true"
        style={{ color, fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>★</span>
    );
  }
  if (name === 'X') {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke={color || 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  // Generic fallback — a small filled dot.
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={color || 'currentColor'}>
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}
