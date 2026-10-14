import { useState } from 'react';

// Admin-managed FAQ accordion. `faqs` come from GET /api/public/faqs; each
// answer is admin-authored HTML, rendered inside a styled wrapper. Renders
// nothing when there are no active FAQs, so the section never shows empty.
// Ported from Morbix; scoped under `.mbx` so the ported Morbix CSS is isolated.
export default function FaqSection({ faqs = [], title = 'Frequently asked questions', eyebrow = 'Help Center' }) {
  const [open, setOpen] = useState(() => new Set());
  if (!Array.isArray(faqs) || faqs.length === 0) return null;

  const toggle = (id) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="mbx">
      <section className="section container faq-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 style={{ marginTop: 8 }}>{title}</h2>
          </div>
        </div>

        <div className="faq-list">
          {faqs.map((f) => {
            const isOpen = open.has(f.id);
            return (
              <div className={`faq-item${isOpen ? ' open' : ''}`} key={f.id}>
                <button
                  className="faq-q"
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${f.id}`}
                  id={`faq-q-${f.id}`}
                  onClick={() => toggle(f.id)}
                >
                  <span>{f.question}</span>
                  <span className="faq-plus" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </button>
                <div className="faq-a" id={`faq-a-${f.id}`} role="region" aria-labelledby={`faq-q-${f.id}`}>
                  <div className="faq-a-inner">
                    <div className="faq-answer" dangerouslySetInnerHTML={{ __html: f.answer || '' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
