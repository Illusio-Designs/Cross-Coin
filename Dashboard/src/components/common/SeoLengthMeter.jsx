/**
 * Visual feedback for SEO copy length.
 *
 *   title:        50-60 chars ideal, 60+ gets ellipsed by Google
 *   description:  140-160 chars ideal, < 70 / > 165 are both bad
 *
 * Renders a compact bar with the live char count and a colour that
 * mirrors Google Search Console's "good / warn / bad" semantics.
 *
 * Usage:
 *   <SeoLengthMeter value={form.metaTitle} type="title" />
 *   <SeoLengthMeter value={form.metaDescription} type="description" />
 */

const RANGES = {
  title: {
    optimal: [50, 60],
    warn:    [40, 70],
    max:     90,
  },
  description: {
    optimal: [140, 160],
    warn:    [120, 170],
    max:     200,
  },
};

function statusFor(value, ranges) {
  // Monochrome: severity is conveyed by the greyscale weight of the fill plus
  // the label text, not by hue (matches the black-and-white dashboard theme).
  const n = value.length;
  if (n === 0) return { color: 'var(--ds-color-text-faint)', label: 'empty', tone: 'neutral' };
  if (n >= ranges.optimal[0] && n <= ranges.optimal[1]) {
    return { color: 'var(--ds-color-text)', label: 'optimal', tone: 'good' };
  }
  if (n >= ranges.warn[0] && n <= ranges.warn[1]) {
    return { color: 'var(--ds-color-text-muted)', label: n < ranges.optimal[0] ? 'too short' : 'a bit long', tone: 'warn' };
  }
  return { color: 'var(--ds-color-text-faint)', label: n < ranges.warn[0] ? 'much too short' : 'too long', tone: 'bad' };
}

export default function SeoLengthMeter({ value = '', type = 'title' }) {
  const ranges = RANGES[type] || RANGES.title;
  const status = statusFor(value || '', ranges);
  const pct = Math.min((value.length / ranges.optimal[1]) * 100, 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <div style={{
        flex: 1,
        height: 4,
        background: 'var(--ds-color-border)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: status.color,
          transition: 'width 0.2s ease, background 0.2s ease',
        }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--ds-color-text-muted)', fontWeight: 600, minWidth: 110, textAlign: 'right' }}>
        {value.length} chars · {status.label}
      </div>
    </div>
  );
}
