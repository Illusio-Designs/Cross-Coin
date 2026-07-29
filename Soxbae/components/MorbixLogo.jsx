/**
 * Soxbae wordmark — a vector rendition of the brand logo:
 * a navy person-figure "M" mark + the teal "orbix" wordmark.
 *
 * This is a faithful recreation (the original artwork was shared as an image,
 * not a file). To use the exact logo, drop it at public/logo.webp and replace
 * this component's usage with <img src="/logo.webp" alt="Soxbae" />.
 */
export default function SoxbaeLogo({ height = 30, className = '' }) {
  return (
    <svg
      className={className}
      height={height}
      viewBox="0 0 192 56"
      role="img"
      aria-label="Soxbae"
      style={{ display: 'block', width: 'auto' }}
    >
      {/* Person-figure "M" — navy */}
      <circle cx="15.5" cy="11" r="6" fill="#202c6e" />
      <path
        d="M3 47 L7.5 24 L15.5 37 L23.5 24 L28 47"
        fill="none"
        stroke="#202c6e"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* "orbix" wordmark — teal, uses the site font */}
      <text
        x="38"
        y="43"
        fontFamily="var(--font-body), Inter, system-ui, sans-serif"
        fontSize="37"
        fontWeight="800"
        letterSpacing="-1.6"
        fill="#2fa39b"
      >
        orbix
      </text>
    </svg>
  );
}
