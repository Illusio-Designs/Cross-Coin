import Icon from '@/components/Icon';
import { textBlocks } from '@/lib/text';

// Standalone FAQ accordion — the last full-width section on the PDP, mirroring
// the Morbix layout (FAQ sits on its own after the reviews). Uses the same
// Soxbae `.pdx-faq` styling as the in-story questions block it replaces.
export default function ProductFaq({ faqs = [], title = 'Frequently asked questions', eyebrow = 'Help centre' }) {
  const items = (faqs || []).slice(0, 8);
  if (items.length === 0) return null;

  return (
    <section className="section container pdx-faq-section" aria-labelledby="pdx-faq-h">
      <div className="pdx-faq-head">
        <span className="eyebrow">{eyebrow}</span>
        <h2 id="pdx-faq-h">{title}</h2>
      </div>
      <div className="pdx-faq">
        {items.map((f, i) => (
          <details key={f.id ?? i} open={i === 0}>
            <summary>{f.question}<Icon name="ChevronDown" size={18} /></summary>
            <div className="pdx-faq-a">
              {textBlocks(f.answer).map((b, k) => b.type === 'ul'
                ? <ul key={k}>{b.lines.map((l, j) => <li key={j}>{l}</li>)}</ul>
                : <p key={k}>{b.lines[0]}</p>)}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
