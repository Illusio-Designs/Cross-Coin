import Icon from '@/components/Icon';

// Soxbae reviews — minimal: a single centred testimonial on the ivory, framed by
// thin rules. No cards, no grid, no avatars.
export default function ReviewsSection({ reviews = [] }) {
  const withText = reviews.filter((r) => (r.text || '').trim());
  const lead = withText[0] || reviews[0];
  if (!lead) return null;

  return (
    <section className="section container sx-quote">
      <span className="eyebrow sx-quote-eyebrow">In their words</span>
      <div className="sx-quote-stars" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <Icon key={i} name="Star" size={16} color={i < (lead.rating || 5) ? 'var(--accent)' : 'var(--line)'} />
        ))}
      </div>
      <blockquote className="sx-quote-text">{lead.text || lead.title}</blockquote>
      <div className="sx-quote-by">{lead.author}{lead.date ? <em> · {lead.date}</em> : null}</div>
    </section>
  );
}
